import Navigo from 'navigo';
import { getUser } from './auth/state.js';

export const router = new Navigo('/');

function getPage(): HTMLElement {
  return document.getElementById('page')!;
}

function requireAuthGuard(done: Function) {
  if (!getUser()) {
    router.navigate('/login');
    return;
  }
  done();
}

export function setupRoutes() {
  router
    .on('/', async () => {
      const { renderLanding } = await import('./pages/landing.js');
      getPage().innerHTML = await renderLanding();
    })
    .on('/login', async () => {
      const { renderLogin } = await import('./pages/login.js');
      getPage().innerHTML = renderLogin();
      const { initLogin } = await import('./pages/login.js');
      initLogin();
    })
    .on('/register', async () => {
      const { renderRegister, initRegister } = await import('./pages/register.js');
      getPage().innerHTML = renderRegister();
      initRegister();
    })
    .on('/discover', async () => {
      const { renderDiscover, initDiscover } = await import('./pages/discover.js');
      getPage().innerHTML = renderDiscover();
      initDiscover();
    })
    .on('/dashboard', async () => {
      if (!getUser()) { router.navigate('/login'); return; }
      const { renderDashboard, initDashboard } = await import('./pages/dashboard.js');
      getPage().innerHTML = renderDashboard();
      initDashboard();
    })
    .on('/groups/new', async () => {
      if (!getUser()) { router.navigate('/login'); return; }
      const { renderCreateGroup, initCreateGroup } = await import('./pages/createGroup.js');
      getPage().innerHTML = renderCreateGroup();
      initCreateGroup();
    })
    .on('/groups/:slug', async (match) => {
      const slug = match?.data?.slug || '';
      const { renderGroupDetail, initGroupDetail } = await import('./pages/groupDetail.js');
      getPage().innerHTML = await renderGroupDetail(slug);
      initGroupDetail(slug);
    })
    .on('/groups/:slug/threads', async (match) => {
      const slug = match?.data?.slug || '';
      const { renderThreadList, initThreadList } = await import('./pages/threadList.js');
      getPage().innerHTML = await renderThreadList(slug);
      initThreadList(slug);
    })
    .on('/groups/:slug/threads/new', async (match) => {
      if (!getUser()) { router.navigate('/login'); return; }
      const slug = match?.data?.slug || '';
      const { renderCreateThread, initCreateThread } = await import('./pages/createThread.js');
      getPage().innerHTML = renderCreateThread(slug);
      initCreateThread(slug);
    })
    .on('/groups/:slug/threads/:id', async (match) => {
      const slug = match?.data?.slug || '';
      const id = match?.data?.id || '';
      const { renderThreadDetail, initThreadDetail } = await import('./pages/threadDetail.js');
      getPage().innerHTML = await renderThreadDetail(slug, id);
      initThreadDetail(slug, id);
    })
    .on('/groups/:slug/members', async (match) => {
      if (!getUser()) { router.navigate('/login'); return; }
      const slug = match?.data?.slug || '';
      const { renderMemberList, initMemberList } = await import('./pages/memberList.js');
      getPage().innerHTML = await renderMemberList(slug);
      initMemberList(slug);
    })
    .on('/groups/:slug/settings', async (match) => {
      if (!getUser()) { router.navigate('/login'); return; }
      const slug = match?.data?.slug || '';
      const { renderGroupSettings, initGroupSettings } = await import('./pages/groupSettings.js');
      getPage().innerHTML = await renderGroupSettings(slug);
      initGroupSettings(slug);
    })
    .on('/profile', async () => {
      if (!getUser()) { router.navigate('/login'); return; }
      const { renderProfile, initProfile } = await import('./pages/profile.js');
      getPage().innerHTML = renderProfile();
      initProfile();
    })
    .on('/profile/:id', async (match) => {
      const id = match?.data?.id || '';
      const { renderPublicProfile, initPublicProfile } = await import('./pages/publicProfile.js');
      getPage().innerHTML = await renderPublicProfile(id);
      initPublicProfile(id);
    })
    .notFound(() => {
      getPage().innerHTML = `
        <div class="text-center py-5">
          <h1 class="display-4">404</h1>
          <p class="lead">Page not found.</p>
          <a href="/" data-navigo class="btn btn-primary">Go home</a>
        </div>
      `;
      router.updatePageLinks();
    });

  router.resolve();
}
