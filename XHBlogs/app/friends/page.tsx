import type { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import FriendsBoard from './FriendsBoard';
import { getFriends, getSiteSettings } from '@/lib/public-api';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `友链 | ${settings.siteTitle}`,
    description: "赛博空间里的有趣灵魂",
  };
}

export default async function FriendsPage() {
  const friends = await getFriends();
  return (
    <div className="min-h-screen relative pb-20">
      <Navbar />
      <PageTransition>
        <div className="mt-28">
          <FriendsBoard friends={friends} />
        </div>
      </PageTransition>
    </div>
  );
}
