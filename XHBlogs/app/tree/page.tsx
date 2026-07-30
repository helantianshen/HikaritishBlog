import CreativeWorkshopClient from './CreativeWorkshopClient';
import { htmlToText } from '../../lib/article-html';
import {
  getAlbums,
  getArticles,
  getFriends,
} from '../../lib/public-api';
import type { Article, ArticleKind } from '../../lib/types';

function toWorkshopItem(article: Article, type: ArticleKind) {
  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    type,
    date: article.publishedAt || article.createdAt,
    cover: article.coverUrl || article.imageUrls[0] || '',
    content: article.summary || htmlToText(article.renderedHtml),
  };
}

export default async function CreativeWorkshopPage() {
  const [postResult, chatterResult, momentResult, albums, friends] = await Promise.all([
    getArticles('post', 100, true),
    getArticles('chatter', 100, true),
    getArticles('moment', 100, true),
    getAlbums(),
    getFriends(),
  ]);

  return (
    <CreativeWorkshopClient
      posts={postResult.items.map((article) => toWorkshopItem(article, 'post'))}
      chatters={chatterResult.items.map((article) => toWorkshopItem(article, 'chatter'))}
      moments={momentResult.items.map((article) => toWorkshopItem(article, 'moment'))}
      albums={albums}
      friends={friends}
    />
  );
}
