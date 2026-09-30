import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_STRUCTURE, groupHasAccess } from './navConfig';
import ScrollFade from './ScrollFade';

function SheetItems({ node, canAccess }) {
  if (node.items) {
    return node.items
      .filter((it) => canAccess(it.pageId))
      .map((it) => (
        <NavLink key={it.to} to={it.to} className={({ isActive }) => 'mobile-sheet-link' + (isActive ? ' active' : '')}>
          {it.label}
        </NavLink>
      ));
  }
  if (node.subgroups) {
    return node.subgroups.map((sg) => {
      const items = sg.items.filter((it) => canAccess(it.pageId));
      if (!items.length) return null;
      return (
        <div key={sg.id} className="mobile-sheet-subgroup">
          <div className="mobile-sheet-sublabel">{sg.groupLabel || sg.label}</div>
          {items.map((it) => (
            <NavLink key={it.to} to={it.to} className={({ isActive }) => 'mobile-sheet-link' + (isActive ? ' active' : '')}>
              {it.label}
            </NavLink>
          ))}
        </div>
      );
    });
  }
  return null;
}

export default function MobileNav() {
  const { canAccess } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openSheet, setOpenSheet] = useState(null);

  useEffect(() => {
    setOpenSheet(null);
  }, [location.pathname]);

  const visibleNodes = NAV_STRUCTURE.filter((n) => groupHasAccess(n, canAccess));
  const activeNode = visibleNodes.find((n) => n.id === openSheet);

  return (
    <>
      {activeNode && (
        <div className="mobile-sheet-bg" onClick={() => setOpenSheet(null)}>
          <div className="mobile-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-sheet-handle" />
            <div className="mobile-sheet-head">{activeNode.groupLabel || activeNode.label}</div>
            <ScrollFade className="mobile-sheet-body">
              <SheetItems node={activeNode} canAccess={canAccess} />
            </ScrollFade>
          </div>
        </div>
      )}

      <nav className="mobile-bottomnav">
        {visibleNodes.map((node) => (
          <button
            key={node.id}
            type="button"
            className={'mobile-navbtn' + (openSheet === node.id ? ' active' : '')}
            onClick={() => {
              if (node.type === 'link') {
                navigate(node.to);
                setOpenSheet(null);
              } else {
                setOpenSheet((o) => (o === node.id ? null : node.id));
              }
            }}
          >
            <span className="mobile-navbtn-icon">{node.icon}</span>
            <span className="mobile-navbtn-label">{node.mobileLabel || node.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
