from django.core.management.base import BaseCommand
from orders.models import UserProfile
from orders.supabase_client import get_supabase_client


class Command(BaseCommand):
    help = 'Sync existing Supabase users to UserProfile table'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be synced without actually creating records',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        try:
            # Get Supabase client
            sb = get_supabase_client()
            
            # Get all users from Supabase auth
            response = sb.auth.admin.list_users()
            
            if hasattr(response, 'error') and response.error:
                self.stdout.write(
                    self.style.ERROR(f'Failed to get users from Supabase: {response.error}')
                )
                return
            
            # Handle different response formats
            users = []
            if hasattr(response, 'user') and response.user:
                users = response.user
            elif hasattr(response, 'data') and response.data:
                users = response.data
            elif isinstance(response, list):
                users = response
            
            if not users:
                self.stdout.write(
                    self.style.WARNING('No users found in Supabase')
                )
                return
            
            self.stdout.write(f'Found {len(users)} users in Supabase')
            
            synced_count = 0
            skipped_count = 0
            
            for user in users:
                try:
                    user_meta = getattr(user, 'user_metadata', {}) or {}
                    username = user_meta.get('username') or user_meta.get('name') or ''
                    email = getattr(user, 'email', '')
                    user_id = getattr(user, 'id', '')
                    
                    if not username or not email:
                        self.stdout.write(
                            self.style.WARNING(f'Skipping user {user_id}: missing username or email')
                        )
                        skipped_count += 1
                        continue
                    
                    # Check if profile already exists
                    if UserProfile.objects.filter(user_id=user_id).exists():
                        self.stdout.write(
                            f'Profile already exists for {username} ({email})'
                        )
                        continue
                    
                    if dry_run:
                        self.stdout.write(
                            f'Would create profile for {username} ({email})'
                        )
                    else:
                        # Create new profile
                        UserProfile.objects.create(
                            user_id=user_id,
                            email=email,
                            username=username,
                            role=user_meta.get('role', ''),
                            telephone=user_meta.get('telephone') or user_meta.get('phone', ''),
                            country=user_meta.get('country', ''),
                            city=user_meta.get('city', ''),
                            address=user_meta.get('address', ''),
                            postcode=user_meta.get('postcode', ''),
                        )
                        self.stdout.write(
                            self.style.SUCCESS(f'Created profile for {username} ({email})')
                        )
                    
                    synced_count += 1
                
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing user: {e}')
                    )
                    skipped_count += 1
                    continue
            
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f'DRY RUN: Would sync {synced_count} users, {skipped_count} skipped'
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully synced {synced_count} users, {skipped_count} skipped'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to sync users: {e}')
            )
