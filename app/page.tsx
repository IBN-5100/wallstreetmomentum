import Dashboard from '@/components/ui/Dashboard/Dashboard';
import ClientRedirectWrapper from '@/components/ui/Dashboard/ClientRedirectWrapper';
import { createClient } from '@/utils/supabase/server';
import {
  getUserDetails,
  getSubscription,
  getUser
} from '@/utils/supabase/queries';

export default async function Account() {
  const supabase = createClient();
  const [user, userDetails, subscription] = await Promise.all([
    getUser(supabase),
    getUserDetails(supabase),
    getSubscription(supabase)
  ]);

  return (
    <ClientRedirectWrapper>
      <Dashboard
        user={user}
        userName={userDetails?.full_name ?? ''}
        subscription={subscription}
      />
    </ClientRedirectWrapper>
  );
}
