import type { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import TimelineClient from '../../components/TimelineClient';
import { ToastProvider } from '../../components/ToastProvider';
import { getArticles, getSiteSettings } from '../../lib/public-api';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return { title: `归档与探索 | ${settings.siteTitle}` };
}

export default async function Timeline() {
  const [result, settings] = await Promise.all([
    getArticles('post'),
    getSiteSettings(),
  ]);
  const posts = result.items.map((article) => ({
    slug: article.slug,
    title: article.title || '无标题',
    date: article.publishedAt || article.createdAt,
    description: article.summary,
    tags: article.tags.length > 0 ? article.tags : ['未分类'],
    cover: article.coverUrl || settings.defaultPostCoverUrl || '/window.svg',
  }));
  const tagCounts: Record<string, number> = {};
  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  const tagsArray = Object.keys(tagCounts)
    .map(name => ({ name, count: tagCounts[name] }))
    .sort((a, b) => b.count - a.count);

  return (
    // 🌟 2. 在最外层用 ToastProvider 包裹整个页面
    <ToastProvider>
      <div className="min-h-screen relative pb-32">
        <Navbar />
        <PageTransition>
          <TimelineClient posts={posts} tags={tagsArray} />
        </PageTransition>
      </div>
    </ToastProvider>
  );
}
