from django.core.management.base import BaseCommand
from orders.models import Notification
from django.db.models import Count
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Clean up old notifications to keep only the latest 50 per user'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Get all users with notifications
        users_with_notifications = Notification.objects.values('user_email').distinct()
        
        total_deleted = 0
        
        for user_data in users_with_notifications:
            user_email = user_data['user_email']
            notifications = Notification.objects.filter(user_email=user_email).order_by('-created_at')
            count = notifications.count()
            
            if count > 50:
                notifications_to_delete = notifications[50:]
                delete_count = notifications_to_delete.count()
                
                if dry_run:
                    self.stdout.write(
                        self.style.WARNING(
                            f'Would delete {delete_count} old notifications for {user_email} (keeping latest 50)'
                        )
                    )
                else:
                    # Get IDs to delete
                    ids_to_delete = list(notifications_to_delete.values_list('id', flat=True))
                    Notification.objects.filter(id__in=ids_to_delete).delete()
                    
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Deleted {delete_count} old notifications for {user_email} (kept latest 50)'
                        )
                    )
                    total_deleted += delete_count
            else:
                if dry_run:
                    self.stdout.write(
                        f'User {user_email}: {count} notifications (no cleanup needed)'
                    )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would delete {total_deleted} notifications total'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Cleanup complete! Deleted {total_deleted} old notifications total'
                )
            )
