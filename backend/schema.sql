-- ============================================
--  ENABLE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
--  SEQUENCES
-- ============================================
CREATE SEQUENCE IF NOT EXISTS order_code_seq START 1;

-- ============================================
--  ENUM TYPES
-- ============================================
CREATE TYPE user_role AS ENUM ('Admin', 'Shipper', 'Receiver', 'ForwardingAgent');

CREATE TYPE order_status AS ENUM ('Pending', 'Offered', 'Accepted', 'Shipped', 'Delivered');

CREATE TYPE offer_status AS ENUM ('Pending', 'Accepted', 'Rejected');

CREATE TYPE shipment_status AS ENUM (
    'InPlanning',
    'SpaceBooked',
    'SpaceCanceled',
    'Loaded',
    'ArrivedAtDeparturePort',
    'InTransit',
    'ArrivedAtDestinationPort',
    'PreparingForOnCarriage',
    'InCustomsClearanceAndDelivery',
    'Completed',
    'ContainerBeingReturned',
    'ReturnCompleted'
);

CREATE TYPE cargo_unit AS ENUM ('Container', 'Pallet', 'Box', 'Piece', 'Roll', 'Package');

CREATE TYPE delivery_type AS ENUM ('Air', 'Sea', 'Land');

CREATE TYPE incoterm AS ENUM ('EXW', 'FOB', 'CIF', 'CFR', 'DAP');

CREATE TYPE currency_type AS ENUM ('EUR', 'CNY', 'USD', 'GBP', 'JPY');

-- ============================================
--  USERS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'Shipper',
    company_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address1 VARCHAR(255) NOT NULL,
    address2 VARCHAR(255) NOT NULL,
    country VARCHAR(100) NOT NULL,
    vat_number VARCHAR(50) NOT NULL,
    eori_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
--  USER RELATIONS (bidirectional)
-- ============================================
CREATE TABLE user_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    related_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, related_user_id)
);

-- Trigger function: automatically insert reverse relationship
CREATE OR REPLACE FUNCTION create_bidirectional_relation()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_relations
        WHERE user_id = NEW.related_user_id
          AND related_user_id = NEW.user_id
    ) THEN
        INSERT INTO user_relations (user_id, related_user_id)
        VALUES (NEW.related_user_id, NEW.user_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: ensure relationships are always bidirectional
CREATE TRIGGER user_relations_bidirectional
AFTER INSERT ON user_relations
FOR EACH ROW EXECUTE FUNCTION create_bidirectional_relation();

-- ============================================
--  ORDERS
-- ============================================
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code VARCHAR(100) UNIQUE NOT NULL DEFAULT CONCAT('ORD-', LPAD(nextval('order_code_seq')::TEXT, 6, '0')),
    sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
    receiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    from_port VARCHAR(255) NOT NULL,
    to_port VARCHAR(255) NOT NULL,
    goods_description TEXT,
    delivery_type delivery_type NOT NULL,
    incoterm incoterm NOT NULL,
    load_date DATE,
    status order_status NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
--  ORDER CARGO (multiple cargo units per order)
-- ============================================
CREATE TABLE order_cargo (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    cargo_unit cargo_unit NOT NULL,
    cargo_quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_order_cargo_order_id ON order_cargo(order_id);

-- ============================================
--  OFFERS
-- ============================================
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    carrier_company VARCHAR(255),
    freight_cost DECIMAL(12,2),
    port_surcharge DECIMAL(12,2),
    trucking_fee DECIMAL(12,2),
    custom_clearance DECIMAL(12,2),
    currency currency_type DEFAULT 'EUR',
    status offer_status NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
--  SHIPMENTS
-- ============================================
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    offer_id UUID UNIQUE REFERENCES offers(id) ON DELETE CASCADE,
    shipment_number VARCHAR(100) UNIQUE,
    tracking_link TEXT,
    departure_date DATE,
    arrival_date DATE,
    status shipment_status NOT NULL DEFAULT 'InPlanning',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
--  CONTAINERS
-- ============================================
CREATE TABLE containers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_number VARCHAR(100) UNIQUE NOT NULL,
    container_type VARCHAR(50),
    tare_weight DECIMAL(10,2),
    gross_weight DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
--  SHIPMENT-CONTAINER (M:N)
-- ============================================
CREATE TABLE shipment_containers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (shipment_id, container_id)
);

-- ============================================
--  CONTAINER ITEMS
-- ============================================
CREATE TABLE container_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit cargo_unit NOT NULL,
    cn_code VARCHAR(20) CHECK (cn_code ~ '^[0-9]{8,10}$'),
    eu_code VARCHAR(20) CHECK (eu_code ~ '^[0-9]{8,10}$'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
--  UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER trg_update_users BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_orders BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_order_cargo BEFORE UPDATE ON order_cargo
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_offers BEFORE UPDATE ON offers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_shipments BEFORE UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_containers BEFORE UPDATE ON containers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_update_container_items BEFORE UPDATE ON container_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
--  AUTO-CREATE SHIPMENT WHEN OFFER ACCEPTED
-- ============================================
CREATE OR REPLACE FUNCTION create_shipment_when_offer_accepted()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Accepted' AND OLD.status IS DISTINCT FROM 'Accepted' THEN
        INSERT INTO shipments (
            order_id,
            offer_id,
            shipment_number,
            status
        )
        VALUES (
            NEW.order_id,
            NEW.id,
            CONCAT('SHIP-', TO_CHAR(NOW(), 'YYYYMMDDHH24MISS')),
            'InPlanning'
        );

        UPDATE orders
        SET status = 'Accepted'
        WHERE id = NEW.order_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_offer_accept
AFTER UPDATE ON offers
FOR EACH ROW
EXECUTE FUNCTION create_shipment_when_offer_accepted();
