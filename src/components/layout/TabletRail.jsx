import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_STRUCTURE, groupHasAccess } from './navConfig';
import ScrollFade from './ScrollFade';

function NodeLinks({ node, canAccess }) {
  if (node.items) {
    return node.items
      .filter((it) => canAccess(it.pageId))
      .map((it) => (
        <NavLink key={it.to} to={it.to} className={({ isActive }) => 'rail-link' + (isActive ? ' active' : '')}>
          {it.label}
        </NavLink>
      ));
  }
  if (node.subgroups) {
    return node.subgroups.map((sg) => {
      const items = sg.items.filter((it) => canAccess(it.pageId));
      if (!items.length) return null;
      return (
        <div key={sg.id} className="rail-subgroup">
          <div className="rail-subgroup-label">{sg.groupLabel || sg.label}</div>
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => 'rail-link' + (isActive ? ' active' : '')}>
              {it.label}
            </NavLink>
          ))}
        </div>
      );
    });
  }
  return null;
}

function FullMenu({ nodes, canAccess }) {
  return nodes.map((node) => (
    <div key={node.id} className="tablet-overlay-group">
      {node.type === 'link' ? (
        <NavLink to={node.to} className={({ isActive }) => 'rail-link toplevel' + (isActive ? ' active' : '')}>
          {node.icon} {node.label}
        </NavLink>
      ) : (
        <>
          <div className="rail-group-label">{node.groupLabel || node.label}</div>
          <NodeLinks node={node} canAccess={canAccess} />
        </>
      )}
    </div>
  ));
}

function RailIcon({ node, active, onClick }) {
  return (
    <button type="button" className={'rail-icon-btn' + (active ? ' active' : '')} onClick={onClick} title={node.label}>
      <span className="rail-icon-emoji">{node.icon}</span>
      <span className="rail-icon-label">{node.label}</span>
    </button>
  );
}

export default function TabletRail() {
  const { canAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openFlyout, setOpenFlyout] = useState(null);
  const [overlayOpen, setOverlayOpen] = useState(false);

  useEffect(() => {
    setOpenFlyout(null);
    setOverlayOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!openFlyout) return undefined;
    function onDown(e) {
      const target = e.target;
      if (target instanceof Element && (target.closest('.tablet-rail') || target.closest('.rail-flyout'))) return;
      setOpenFlyout(null);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [openFlyout]);

  const visibleNodes = NAV_STRUCTURE.filter((n) => groupHasAccess(n, canAccess));
  const activeNode = visibleNodes.find((n) => n.id === openFlyout);

  return (
    <>
      <aside className="tablet-rail">
        <button type="button" className="rail-hamburger" onClick={() => setOverlayOpen(true)} title="Menu Lengkap" aria-label="Buka menu lengkap">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>
        <div className="rail-icons">
          {visibleNodes.map((node) => (
            <RailIcon
              key={node.id}
              node={node}
              active={openFlyout === node.id}
              onClick={() => {
                if (node.type === 'link') {
                  navigate(node.to);
                  setOpenFlyout(null);
                } else {
                  setOpenFlyout((o) => (o === node.id ? null : node.id));
                }
              }}
            />
          ))}
        </div>
      </aside>

      {activeNode && (
        <div className="rail-flyout">
          <div className="rail-flyout-head">{activeNode.groupLabel || activeNode.label}</div>
          <ScrollFade className="rail-flyout-body">
            <NodeLinks node={activeNode} canAccess={canAccess} />
          </ScrollFade>
        </div>
      )}

      {overlayOpen && (
        <div className="tablet-overlay-bg" onClick={() => setOverlayOpen(false)}>
          <div className="tablet-overlay" onClick={(e) => e.stopPropagation()}>
            <div className="tablet-overlay-head">
              <span>Menu</span>
              <button type="button" className="tablet-overlay-close" onClick={() => setOverlayOpen(false)} aria-label="Tutup menu">✕</button>
            </div>
            <ScrollFade className="tablet-overlay-body">
              <FullMenu nodes={visibleNodes} canAccess={canAccess} />
            </ScrollFade>
          </div>
        </div>
      )}
    </>
  );
}
