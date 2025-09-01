from django.core.management.base import BaseCommand
from orders.models import UserProfile
from orders.supabase_client import get_supabase_client


class Command(BaseCommand):
    help = 'Populate UserProfile table with existing Supabase users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be created without actually creating records',
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
            
            created_count = 0
            updated_count = 0
            
            for user in users:
                try:
                    user_meta = getattr(user, 'user_metadata', {}) or {}
                    username = user_meta.get('username', '')
                    email = getattr(user, 'email', '')
                    user_id = getattr(user, 'id', '')
                    
                    if not username or not email:
                        self.stdout.write(
                            self.style.WARNING(f'Skipping user {user_id}: missing username or email')
                        )
                        continue
                    
                    # Check if profile already exists
                    profile, created = UserProfile.objects.get_or_create(
                        user_id=user_id,
                        defaults={
                            'email': email,
                            'username': username,
                            'role': user_meta.get('role', ''),
                            'telephone': user_meta.get('telephone', ''),
                            'country': user_meta.get('country', ''),
                            'city': user_meta.get('city', ''),
                            'address': user_meta.get('address', ''),
                            'postcode': user_meta.get('postcode', ''),
                        }
                    )
                    
                    if created:
                        created_count += 1
                        if not dry_run:
                            self.stdout.write(
                                self.style.SUCCESS(f'Created profile for {username} ({email})')
                            )
                        else:
                            self.stdout.write(
                                f'Would create profile for {username} ({email})'
                            )
                    else:
                        # Update existing profile
                        updated = False
                        if profile.username != username:
                            profile.username = username
                            updated = True
                        if profile.email != email:
                            profile.email = email
                            updated = True
                        if profile.role != user_meta.get('role', ''):
                            profile.role = user_meta.get('role', '')
                            updated = True
                        if profile.telephone != user_meta.get('telephone', ''):
                            profile.telephone = user_meta.get('telephone', '')
                            updated = True
                        if profile.country != user_meta.get('country', ''):
                            profile.country = user_meta.get('country', '')
                            updated = True
                        if profile.city != user_meta.get('city', ''):
                            profile.city = user_meta.get('city', '')
                            updated = True
                        if profile.address != user_meta.get('address', ''):
                            profile.address = user_meta.get('address', '')
                            updated = True
                        if profile.postcode != user_meta.get('postcode', ''):
                            profile.postcode = user_meta.get('postcode', '')
                            updated = True
                        
                        if updated:
                            if not dry_run:
                                profile.save()
                                updated_count += 1
                                self.stdout.write(
                                    self.style.SUCCESS(f'Updated profile for {username} ({email})')
                                )
                            else:
                                self.stdout.write(
                                    f'Would update profile for {username} ({email})'
                                )
                
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'Error processing user: {e}')
                    )
                    continue
            
            if dry_run:
                self.stdout.write(
                    self.style.WARNING(
                        f'DRY RUN: Would create {created_count} and update {updated_count} profiles'
                    )
                )
            else:
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully created {created_count} and updated {updated_count} user profiles'
                    )
                )
                
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Failed to populate user profiles: {e}')
            )
