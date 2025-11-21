import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { pool } from '../config/database';

dotenv.config();

const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const fromEmail = process.env.EMAIL_FROM || smtpUser;

if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !fromEmail) {
  console.warn('[email] SMTP configuration is incomplete. Email sending will be disabled.');
}

const transporter = (smtpHost && smtpPort && smtpUser && smtpPass && fromEmail)
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // common secure port
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;

async function sendEmail(to: string | string[], subject: string, text: string, html?: string) {
  if (!transporter) {
    console.warn('[email] Transporter not configured. Skipping email send.', { to, subject });
    return;
  }

  const toList = Array.isArray(to) ? to : [to];

  if (toList.length === 0) {
    console.warn('[email] Empty recipient list. Skipping email send.', { subject });
    return;
  }

  try {
    await transporter.sendMail({
      from: fromEmail,
      to: toList.join(','),
      subject,
      text,
      html: html || text,
    });
  } catch (err) {
    console.error('[email] Failed to send email', err);
  }
}

async function getAdminEmails(): Promise<string[]> {
  try {
    const result = await pool.query("SELECT email FROM users WHERE role = 'Admin'");
    return result.rows.map((r) => r.email).filter((e: string) => !!e);
  } catch (err) {
    console.error('[email] Failed to fetch admin emails', err);
    return [];
  }
}

export async function sendOrderCreatedEmail(orderId: string) {
  // Fetch order with sender/receiver and cargo details
  const result = await pool.query(
    `SELECT 
        o.order_code,
        o.from_port,
        o.to_port,
        o.delivery_type,
        o.incoterm,
        o.load_date,
        o.goods_description,
        sender.name AS sender_name,
        sender.email AS sender_email,
        receiver.name AS receiver_name,
        receiver.email AS receiver_email,
        COALESCE(
          json_agg(
            json_build_object(
              'cargo_unit', oc.cargo_unit,
              'cargo_quantity', oc.cargo_quantity
            ) ORDER BY oc.created_at
          ) FILTER (WHERE oc.id IS NOT NULL),
          '[]'
        ) AS cargo
      FROM orders o
      LEFT JOIN users sender ON o.sender_id = sender.id
      LEFT JOIN users receiver ON o.receiver_id = receiver.id
      LEFT JOIN order_cargo oc ON o.id = oc.order_id
      WHERE o.id = $1
      GROUP BY o.id, sender.name, sender.email, receiver.name, receiver.email`,
    [orderId],
  );

  if (result.rows.length === 0) return;

  const order = result.rows[0];
  const cargoItems: { cargo_unit: string; cargo_quantity: number }[] = order.cargo || [];

  const cargoLines = cargoItems.map((c) => `  - ${c.cargo_unit}: ${c.cargo_quantity}`).join('\n') || '  (none)';

  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) return;

  const subject = `New order created: ${order.order_code}`;
  const text = `A new order has been created.

Order code: ${order.order_code}
Sender: ${order.sender_name || '-'} (${order.sender_email || '-'})
Receiver: ${order.receiver_name || '-'} (${order.receiver_email || '-'})
From port: ${order.from_port}
To port: ${order.to_port}
Delivery type: ${order.delivery_type}
Incoterm: ${order.incoterm}
Goods load date: ${order.load_date || '-'}
Goods description: ${order.goods_description || '-'}
Cargo:
${cargoLines}
`;

  await sendEmail(adminEmails, subject, text);
}

export async function sendOfferCreatedEmails(offerId: string) {
  // Fetch offer + order + users
  const result = await pool.query(
    `SELECT 
        off.id,
        off.carrier_company,
        off.freight_cost,
        off.port_surcharge,
        off.trucking_fee,
        off.custom_clearance,
        off.currency,
        (COALESCE(off.freight_cost, 0) + COALESCE(off.port_surcharge, 0) + COALESCE(off.trucking_fee, 0) + COALESCE(off.custom_clearance, 0)) AS total_price,
        o.order_code,
        o.from_port,
        o.to_port,
        sender.name AS sender_name,
        sender.email AS sender_email,
        receiver.name AS receiver_name,
        receiver.email AS receiver_email
      FROM offers off
      LEFT JOIN orders o ON off.order_id = o.id
      LEFT JOIN users sender ON o.sender_id = sender.id
      LEFT JOIN users receiver ON o.receiver_id = receiver.id
      WHERE off.id = $1`,
    [offerId],
  );

  if (result.rows.length === 0) return;

  const row = result.rows[0];
  const totalPrice = row.total_price;

  const subject = `New offer for your order ${row.order_code}`;
  const baseText = (role: 'sender' | 'receiver') => `A new offer has been created for order ${row.order_code}.

Order code: ${row.order_code}
From port: ${row.from_port}
To port: ${row.to_port}
Carrier company: ${row.carrier_company || '-'}
Freight cost: ${row.freight_cost ?? '-'} ${row.currency}
Port surcharge: ${row.port_surcharge ?? '-'} ${row.currency}
Trucking fee: ${row.trucking_fee ?? '-'} ${row.currency}
Custom clearance: ${row.custom_clearance ?? '-'} ${row.currency}
Total price: ${totalPrice ?? '-'} ${row.currency}
`;

  const senderEmail = row.sender_email as string | null;
  const receiverEmail = row.receiver_email as string | null;

  if (senderEmail) {
    await sendEmail(senderEmail, subject, baseText('sender'));
  }
  if (receiverEmail && receiverEmail !== senderEmail) {
    await sendEmail(receiverEmail, subject, baseText('receiver'));
  }
}

export async function sendOfferStatusEmail(offerId: string, action: 'accept' | 'reject') {
  // Fetch offer + order + users
  const result = await pool.query(
    `SELECT 
        off.id,
        off.carrier_company,
        off.freight_cost,
        off.port_surcharge,
        off.trucking_fee,
        off.custom_clearance,
        off.currency,
        (COALESCE(off.freight_cost, 0) + COALESCE(off.port_surcharge, 0) + COALESCE(off.trucking_fee, 0) + COALESCE(off.custom_clearance, 0)) AS total_price,
        o.order_code,
        o.from_port,
        o.to_port,
        sender.name AS sender_name,
        sender.email AS sender_email,
        receiver.name AS receiver_name,
        receiver.email AS receiver_email
      FROM offers off
      LEFT JOIN orders o ON off.order_id = o.id
      LEFT JOIN users sender ON o.sender_id = sender.id
      LEFT JOIN users receiver ON o.receiver_id = receiver.id
      WHERE off.id = $1`,
    [offerId],
  );

  if (result.rows.length === 0) return;

  const row = result.rows[0];
  const adminEmails = await getAdminEmails();
  if (adminEmails.length === 0) return;

  const totalPrice = row.total_price;
  const subject = `Offer ${action === 'accept' ? 'accepted' : 'rejected'} for order ${row.order_code}`;
  const text = `An offer has been ${action === 'accept' ? 'ACCEPTED' : 'REJECTED'}.

Order code: ${row.order_code}
Sender: ${row.sender_name || '-'} (${row.sender_email || '-'})
Receiver: ${row.receiver_name || '-'} (${row.receiver_email || '-'})
From port: ${row.from_port}
To port: ${row.to_port}
Carrier company: ${row.carrier_company || '-'}
Total price: ${totalPrice ?? '-'} ${row.currency}
`;

  await sendEmail(adminEmails, subject, text);
}

export async function sendShipmentStatusEmail(shipmentId: string) {
  const result = await pool.query(
    `SELECT 
        s.id,
        s.shipment_number,
        s.tracking_link,
        s.departure_date,
        s.arrival_date,
        s.status,
        o.order_code,
        o.from_port,
        o.to_port,
        sender.name AS sender_name,
        sender.email AS sender_email,
        receiver.name AS receiver_name,
        receiver.email AS receiver_email,
        off.carrier_company
      FROM shipments s
      LEFT JOIN orders o ON s.order_id = o.id
      LEFT JOIN users sender ON o.sender_id = sender.id
      LEFT JOIN users receiver ON o.receiver_id = receiver.id
      LEFT JOIN offers off ON s.offer_id = off.id
      WHERE s.id = $1`,
    [shipmentId],
  );

  if (result.rows.length === 0) return;

  const row = result.rows[0];

  // Only send for specific statuses
  const allowedStatuses = [
    'Loaded',
    'ArrivedAtDeparturePort',
    'InTransit',
    'ArrivedAtDestinationPort',
    'Completed',
  ];

  if (!allowedStatuses.includes(row.status)) return;

  const subject = `Shipment update: ${row.shipment_number || row.order_code} - ${row.status}`;
  const text = `The status of your shipment has changed.

Shipment number: ${row.shipment_number || '-'}
Order code: ${row.order_code}
From port: ${row.from_port}
To port: ${row.to_port}
Carrier company: ${row.carrier_company || '-'}
Departure date: ${row.departure_date || '-'}
Arrival date: ${row.arrival_date || '-'}
Tracking link: ${row.tracking_link || '-'}
Status: ${row.status}
`;

  const recipients: string[] = [];
  if (row.sender_email) recipients.push(row.sender_email);
  if (row.receiver_email && row.receiver_email !== row.sender_email) {
    recipients.push(row.receiver_email);
  }

  if (recipients.length === 0) return;

  await sendEmail(recipients, subject, text);
}
