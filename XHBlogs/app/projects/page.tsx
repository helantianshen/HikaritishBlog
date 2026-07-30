import type { Metadata } from 'next';
import Navbar from '../../components/Navbar';
import PageTransition from '../../components/PageTransition';
import ProjectsBoard from './ProjectsBoard';
import { getProjects, getSiteSettings } from '@/lib/public-api';

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: `项目矩阵 | ${settings.siteTitle}`,
    description: "开源项目与代码仓库展示",
  };
}

export default async function ProjectsPage() {
  const projects = await getProjects();
  return (
    <div className="min-h-screen relative pb-20">
      <Navbar />
      <PageTransition>
        <div className="mt-28">
          <ProjectsBoard projects={projects} />
        </div>
      </PageTransition>
    </div>
  );
}
