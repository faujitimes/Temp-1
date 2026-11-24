import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  Shield,
  Info,
  Phone,
  Home,
  Search,
} from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";

const links = [
  { name: "Home", path: "/", icon: Home },
  { name: "Search", path: "/search", icon: Search },
  { name: "About", path: "/about", icon: Info },
  { name: "Contact", path: "/contact", icon: Phone },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="bg-veteran-navy text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center shrink-0">
            <Link to="/" className="flex items-center gap-3">
              <Shield className="h-9 w-9 text-veteran-gold shrink-0" />
              <div className="flex flex-col">
                <span className="font-serif font-extrabold text-2xl leading-tight text-white tracking-wide whitespace-nowrap">
                  Faujitimes
                </span>
                <span className="text-[11px] text-veteran-gold uppercase tracking-wider font-semibold whitespace-nowrap">
                  Ex Servicemen Information Hub
                </span>
              </div>
            </Link>
          </div>

          <div className="hidden lg:flex items-center space-x-2">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  className={cn(
                    "px-3.5 py-2 rounded shadow text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0",
                    isActive
                      ? "bg-yellow-400 text-veteran-navy ring-2 ring-amber-500 scale-105"
                      : "bg-veteran-gold text-veteran-navy hover:bg-yellow-400"
                  )}
                >
                  <link.icon className="w-3.5 h-3.5 shrink-0" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="flex lg:hidden items-center">
            <button
              type="button"
              aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2.5 rounded-md text-gray-200 hover:text-white hover:bg-veteran-navy-light min-h-[44px] min-w-[44px]"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden bg-veteran-navy border-t border-veteran-navy-light shadow-inner pb-4">
          <div className="px-4 pt-3 pb-3 space-y-2">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "block px-4 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-3 min-h-[44px]",
                    isActive
                      ? "bg-yellow-400 text-veteran-navy ring-2 ring-amber-500"
                      : "bg-veteran-gold text-veteran-navy hover:bg-yellow-400"
                  )}
                >
                  <link.icon className="w-4 h-4 shrink-0" />
                  {link.name}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </nav>
  );
}
