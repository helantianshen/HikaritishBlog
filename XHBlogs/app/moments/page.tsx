import type { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import MomentList from './MomentList';
import { getArticles, getSiteSettings } from '../../lib/public-api';
import { htmlToText } from '../../lib/article-html';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `说说 | ${settings.siteTitle}`,
    description: "生活动态与瞬间记录",
  };
}

export default async function MomentsPage() {
  const [result, settings] = await Promise.all([
    getArticles('moment', 100, true),
    getSiteSettings(),
  ]);
  const allMoments = result.items.map((article) => ({
    id: article.slug,
    date: article.publishedAt || article.createdAt,
    location: article.location,
    images: article.imageUrls,
    content: article.summary || htmlToText(article.renderedHtml),
  }));
  return (
    <div className="min-h-screen relative pb-10 flex flex-col">
      <Navbar />
      <PageTransition className="flex flex-1 flex-col">
        <MomentList
          moments={allMoments}
          authorName={settings.authorName}
          avatarUrl={settings.avatarUrl}
        />
      </PageTransition>
    </div>
  );
}
