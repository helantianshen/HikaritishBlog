import type { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import ChatterBoard from './ChatterBoard';
import { getArticles, getSiteSettings } from '@/lib/public-api';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `杂谈 | ${settings.siteTitle}`,
    description: settings.chatterDescription,
  };
}

export default async function ChatterPage() {
  const result = await getArticles('chatter');
  const chatters = result.items.map((article) => ({
    slug: article.slug,
    title: article.title,
    date: article.publishedAt || article.createdAt,
    tags: article.tags,
    mood: article.mood,
    cover: article.coverUrl,
    content: article.summary,
  }));
  return (
    <div className="min-h-screen relative pb-10">
      <Navbar />
      <PageTransition>
        {/* 将解析好的数据传递给客户端组件进行瀑布流渲染 */}
        <ChatterBoard chatters={chatters} />
      </PageTransition>
    </div>
  );
}
