"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  LayoutGrid,
  Crown,
  Search,
  Telescope,
  Image as ImageIcon,
  Video,
  Mic,
  FileText,
  Zap,
  Bot,
  Brain,
  FolderKanban,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  SquarePen,
  ChevronDown,
  PanelLeftClose,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { AuthUser, clearToken } from "@/lib/auth";
import { HolloConnectLogo } from "@/components/branding/HolloConnectLogo";
import { PageWatermark } from "@/components/branding/PageWatermark";
import { SidebarChatList } from "@/components/layout/SidebarChatList";
import { ChatSearchModal } from "@/components/layout/ChatSearchModal";
import { useSetMotionPreference } from "@/components/providers/MotionPreferenceProvider";
import { useChatList, DisplayChat } from "@/hooks/useChatList";

// Primary nav — the small set of things visible immediately, always. Everything else lives
// in the collapsible "More" group below so the sidebar doesn't read as a 13-item admin menu.
const PRIMARY_ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/library", label: "Library", icon: LayoutGrid },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/automations", label: "Automations", icon: Zap },
  { href: "/pricing", label: "Upgrade", icon: Crown },
];

// Secondary tools — every other module. Nothing here was removed from the app, it's just
// tucked behind "More" instead of competing for attention with primary nav every page load.
const MORE_ITEMS = [
  { href: "/search", label: "AI Search", icon: Search },
  { href: "/research", label: "Deep Research", icon: Telescope },
  { href: "/images", label: "Image AI", icon: ImageIcon },
  { href: "/videos", label: "Video AI", icon: Video },
  { href: "/voice", label: "Voice AI", icon: Mic },
  { href: "/documents", label: "Document AI", icon: FileText },
  { href: "/agents", label: "AI Agents", icon: Bot },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface SidebarCtx {
  openChatSearch: () => void;
  refreshChats: () => void;
  setActiveChatId: (id: string | undefined) => void;
  /** The same chat list the sidebar and search modal already fetch — exposed so the Chat
      page's WelcomeScreen ("Continue where you left off") can reuse it instead of firing its
      own independent request for identical data on every visit to an empty conversation. */
  chats: DisplayChat[];
  chatsLoading: boolean;
}

const SidebarContext = createContext<SidebarCtx | null>(null);

/** Lets any page nested inside AppShell (chiefly the Chat page) open the same chat-search
    overlay the sidebar uses, tell the sidebar which conversation is currently open (so its
    recent-chats list can highlight it), ask that list to re-fetch after a new
    conversation is created, and read the already-fetched chat list. Returns no-ops/empty
    data outside AppShell so callers never need to guard for "am I inside the shell". */
export function useSidebar(): SidebarCtx {
  return (
    useContext(SidebarContext) ?? {
      openChatSearch: () => {},
      refreshChats: () => {},
      setActiveChatId: () => {},
      chats: [],
      chatsLoading: false,
    }
  );
}

function NavLink({
  href,
  label,
  Icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm transition-all duration-200 ${
        collapsed ? "justify-center" : ""
      } ${active ? "text-white" : "text-gray-400 hover:text-white hover:bg-white/[0.05] active:scale-[0.98]"}`}
    >
      {active && (
        <motion.div
          layoutId="nav-active-pill"
          className="absolute inset-0 rounded-xl bg-white/[0.09] border border-white/[0.08] shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset]"
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
        />
      )}
      <span
        className={`relative w-4 h-4 flex items-center justify-center shrink-0 transition-colors duration-200 ${
          active ? "text-accent-violet" : "group-hover:text-gray-200"
        }`}
      >
        <Icon size={15} strokeWidth={2} />
      </span>
      {!collapsed && <span className="relative leading-none truncate">{label}</span>}
    </Link>
  );
}

function SidebarContent({
  user,
  pathname,
  collapsed,
  activeChatId,
  chats,
  chatsLoading,
  removeChat,
  renameChat,
  onNavigate,
  onSignOut,
  onOpenSearch,
}: {
  user: AuthUser | null;
  pathname: string | null;
  collapsed: boolean;
  activeChatId?: string;
  chats: DisplayChat[];
  chatsLoading: boolean;
  removeChat: (id: string) => Promise<void>;
  renameChat: (id: string, title: string) => Promise<void>;
  onNavigate?: () => void;
  onSignOut: () => void;
  onOpenSearch: () => void;
}) {
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    // Auto-expand "More" if the current page lives inside it, so the active item is never
    // hidden behind a collapsed group on load.
    if (pathname && MORE_ITEMS.some((i) => pathname.startsWith(i.href))) setMoreOpen(true);
  }, [pathname]);

  function goNewChat() {
    onNavigate?.();
    router.push("/chat");
  }

  return (
    <div className="flex flex-col h-full p-3.5">
      <div className="min-h-0 flex flex-col flex-1">
        <div className={`flex items-center gap-2.5 mb-6 pt-1.5 ${collapsed ? "justify-center px-0" : "px-2"}`}>
          <HolloConnectLogo variant="static" size={26} className="shrink-0" />
          {!collapsed && <span className="text-white font-semibold tracking-tight text-[15px]">HolloConnect AI</span>}
        </div>

        {/* New Chat + Search Chats — the two actions that used to require a separate,
            permanently-visible history column. Now they live at the top of the main
            sidebar instead. */}
        <div className="space-y-1 mb-3">
          <button
            onClick={goNewChat}
            title={collapsed ? "New chat" : undefined}
            className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm bg-accent-gradient text-white shadow-glow-sm hover:shadow-glow transition-shadow duration-200 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <SquarePen size={15} strokeWidth={2} className="shrink-0" />
            {!collapsed && <span className="leading-none">New Chat</span>}
          </button>
          <button
            onClick={onOpenSearch}
            title={collapsed ? "Search chats (Ctrl/Cmd+K)" : undefined}
            className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.045] transition-colors duration-200 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <Search size={15} strokeWidth={2} className="shrink-0" />
            {!collapsed && (
              <span className="flex-1 flex items-center justify-between leading-none">
                Search Chats
                <kbd className="text-[10px] text-gray-600 border border-white/10 rounded px-1 py-0.5">⌘K</kbd>
              </span>
            )}
          </button>
        </div>

        <nav className="space-y-1">
          {PRIMARY_ITEMS.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              label={item.label}
              Icon={item.icon}
              active={!!pathname?.startsWith(item.href)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>

        {!collapsed && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-medium px-2.5 mb-1.5">Chats</p>
            <SidebarChatList
              activeChatId={activeChatId}
              chats={chats}
              loading={chatsLoading}
              removeChat={removeChat}
              renameChat={renameChat}
              onNavigate={onNavigate}
              onSeeAll={onOpenSearch}
            />
          </div>
        )}

        <div className="mt-4 flex-1 overflow-y-auto min-h-0">
          <button
            onClick={() => setMoreOpen((o) => !o)}
            title={collapsed ? "More" : undefined}
            className={`w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/[0.045] transition-colors duration-200 ${
              collapsed ? "justify-center" : "justify-between"
            }`}
          >
            <span className={`flex items-center gap-3 ${collapsed ? "" : ""}`}>
              <span className="w-4 h-4 flex items-center justify-center shrink-0">
                <Bot size={15} strokeWidth={2} />
              </span>
              {!collapsed && <span className="leading-none">More</span>}
            </span>
            {!collapsed && (
              <motion.span animate={{ rotate: moreOpen ? 180 : 0 }} transition={{ duration: 0.15 }}>
                <ChevronDown size={14} />
              </motion.span>
            )}
          </button>
          <AnimatePresence initial={false}>
            {(moreOpen || collapsed) && (
              <motion.nav
                initial={collapsed ? false : { height: 0, opacity: 0 }}
                animate={collapsed ? {} : { height: "auto", opacity: 1 }}
                exit={collapsed ? {} : { height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="space-y-1 mt-1 overflow-hidden"
              >
                {MORE_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    Icon={item.icon}
                    active={!!pathname?.startsWith(item.href)}
                    collapsed={collapsed}
                    onNavigate={onNavigate}
                  />
                ))}
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className={collapsed ? "px-0" : "px-1.5"}>
        {user?.role === "ADMIN" && (
          <Link
            href="/admin"
            onClick={onNavigate}
            title={collapsed ? "Admin Panel" : undefined}
            className={`flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-xs text-accent-violet hover:text-accent-cyan transition-colors mb-2.5 ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center shrink-0">
              <ShieldCheck size={13} />
            </span>
            {!collapsed && "Admin Panel"}
          </Link>
        )}
        <div className="h-px bg-white/10 mb-3" />
        {!collapsed && <p className="text-xs text-gray-500 mb-2 px-1 truncate">{user?.email}</p>}
        <button
          title={collapsed ? "Sign out" : undefined}
          className={`flex items-center gap-2.5 rounded-lg px-1 py-1.5 text-xs text-gray-500 hover:text-white transition-colors w-full ${
            collapsed ? "justify-center" : ""
          }`}
          onClick={onSignOut}
        >
          <span className="w-4 h-4 flex items-center justify-center shrink-0">
            <LogOut size={13} />
          </span>
          {!collapsed && "Sign out"}
        </button>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  children,
  lockMainScroll,
}: {
  user: AuthUser | null;
  children: React.ReactNode;
  /** Set by pages that own their own internal scroll region (currently just /chat, which
      needs a ChatGPT-style layout: fixed header/composer, only the message list scrolls).
      Without this, `main` below is itself a scroll container (`overflow-y-auto`), which
      created a second, competing scroll context on the chat page — the outer page and the
      inner message list could both capture scroll, producing the layout jumps/scroll-jank
      the redesign asked to eliminate. Every other page keeps the previous behavior exactly:
      default is `false`, so `main` still scrolls the whole page as it always has. */
  lockMainScroll?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const setMotionOverride = useSetMotionPreference();

  useEffect(() => {
    // AppShell renders on every authenticated page, so this is the one place that reliably
    // knows the real saved setting — hydrate the app-wide override from it. `undefined` (not
    // yet loaded) is left alone rather than treated as "false", so nothing flashes animated
    // then snaps to reduced for a user who actually has it on.
    if (user && typeof user.reducedMotion === "boolean") setMotionOverride(user.reducedMotion);
  }, [user, setMotionOverride]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatRefreshKey, setChatRefreshKey] = useState(0);
  // The single source of truth for the user's chat list — previously the sidebar list, the
  // search modal, and the chat welcome screen each called useChatList() independently,
  // meaning up to three identical requests fired on a single page load. Fetched once here
  // and shared via SidebarContext (below) to all three.
  const { chats, loading: chatsLoading, removeChat, togglePin, renameChat } = useChatList(chatRefreshKey);
  // Which chat is highlighted in the sidebar's recent list — reported by the Chat page
  // itself via context (see ChatWindow), rather than parsed from the URL, so it's correct
  // regardless of how navigation happened.
  const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Leaving the chat page entirely (e.g. to Dashboard) clears the highlight.
    if (pathname && !pathname.startsWith("/chat")) setActiveChatId(undefined);
  }, [pathname]);

  useEffect(() => {
    const saved = localStorage.getItem("hollo_sidebar_collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((c) => {
      localStorage.setItem("hollo_sidebar_collapsed", !c ? "1" : "0");
      return !c;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function signOut() {
    clearToken();
    router.replace("/login");
  }

  const ctxValue: SidebarCtx = {
    openChatSearch: () => setSearchOpen(true),
    refreshChats: () => setChatRefreshKey((k) => k + 1),
    setActiveChatId,
    chats,
    chatsLoading,
  };

  return (
    <SidebarContext.Provider value={ctxValue}>
      <div className="min-h-screen flex flex-col lg:flex-row">
        {/* Mobile/tablet top bar — the sidebar is desktop-only (lg+), so smaller screens need
            their own nav entry point rather than no navigation at all. */}
        <div className="lg:hidden glass flex items-center justify-between px-4 py-3 shrink-0 h-14">
          <div className="flex items-center gap-2">
            <HolloConnectLogo variant="static" size={22} />
            <span className="text-white font-semibold text-sm">HolloConnect AI</span>
          </div>
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-300 hover:text-white transition-colors p-1"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 34 }}
                className="fixed inset-y-0 left-0 w-72 glass z-50 lg:hidden"
              >
                <button
                  onClick={() => setMobileOpen(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close menu"
                >
                  <X size={18} />
                </button>
                <SidebarContent
                  user={user}
                  pathname={pathname}
                  collapsed={false}
                  activeChatId={activeChatId}
                  chats={chats}
                  chatsLoading={chatsLoading}
                  removeChat={removeChat}
                  renameChat={renameChat}
                  onNavigate={() => setMobileOpen(false)}
                  onSignOut={signOut}
                  onOpenSearch={() => {
                    setMobileOpen(false);
                    setSearchOpen(true);
                  }}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <aside
          className={`glass hidden lg:flex flex-col shrink-0 transition-[width] duration-200 relative ${
            collapsed ? "w-[72px]" : "w-64"
          }`}
        >
          <SidebarContent
            user={user}
            pathname={pathname}
            collapsed={collapsed}
            activeChatId={activeChatId}
            chats={chats}
            chatsLoading={chatsLoading}
            removeChat={removeChat}
            renameChat={renameChat}
            onSignOut={signOut}
            onOpenSearch={() => setSearchOpen(true)}
          />
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute -right-3 top-6 w-6 h-6 rounded-full glass flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            {collapsed ? <PanelLeft size={12} /> : <PanelLeftClose size={12} />}
          </button>
        </aside>

        <main
          className={`relative flex-1 lg:h-screen overflow-x-hidden ${
            lockMainScroll
              ? "overflow-hidden flex flex-col min-h-0 h-[calc(100dvh-3.5rem)] lg:h-screen"
              : "overflow-y-auto"
          }`}
        >
          <PageWatermark />
          {children}
        </main>
      </div>

      <ChatSearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        chats={chats}
        loading={chatsLoading}
        removeChat={removeChat}
        togglePin={togglePin}
        renameChat={renameChat}
      />
    </SidebarContext.Provider>
  );
}
