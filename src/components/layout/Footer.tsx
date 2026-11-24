import { Shield, Mail, MapPin, Phone, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useContent } from "../../context/ContentContext";

export function Footer() {
  const { customTexts, categories } = useContent();

  return (
    <footer className="bg-veteran-olive-dark text-white pt-12 pb-8 border-t-4 border-veteran-gold">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-veteran-gold shrink-0" />
              <span className="font-serif font-bold text-xl tracking-wide">Faujitimes</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              A dedicated information hub for Ex-Servicemen, providing verified circulars, government orders, welfare schemes, and resettlement updates.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-4 text-veteran-gold border-b border-veteran-olive pb-2">
              Portal Categories
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              {categories.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/category/${cat.slug}`}
                    className="hover:text-white transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-4 text-veteran-gold border-b border-veteran-olive pb-2">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/search" className="hover:text-white transition-colors">
                  Search & Archive
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  About Portal
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li className="pt-2">
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-veteran-gold hover:text-white bg-yellow-400/10 hover:bg-yellow-400/20 px-3 py-1.5 rounded border border-veteran-gold/30 transition-all"
                >
                  <Lock className="w-3 h-3 text-veteran-gold" /> Admin Panel
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-base mb-4 text-veteran-gold border-b border-veteran-olive pb-2">
              Contact
            </h3>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 shrink-0 text-veteran-gold/80" />
                <span>
                  {customTexts.contact_address || "175, Ashram Road, Budhpur Delhi 110036"}
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 shrink-0 text-veteran-gold/80" />
                <span>{customTexts.contact_phone || "01127206062"}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 shrink-0 text-veteran-gold/80" />
                <span>{customTexts.contact_email || "faujitimes@gmail.com"}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Institutional Disclaimer */}
        <div className="border-t border-veteran-olive/70 mt-10 pt-6 text-xs text-gray-300/90 leading-relaxed space-y-2">
          <p>
            <strong className="text-veteran-gold uppercase tracking-wider">Disclaimer:</strong>{" "}
            Faujitimes is an independent Ex-Servicemen welfare awareness and information portal. While we strive to publish accurate summaries and verified links to official directives from MoD, DESW, PCDA(P), ECHS, CSD, DGR, and KSB, visitors are advised to verify final eligibility and official notifications directly on the respective Government of India portal before taking financial or legal action.
          </p>
          <p className="text-center text-gray-400 pt-2">
            &copy; {new Date().getFullYear()} Faujitimes. Dedicated to the Armed Forces Veterans.
          </p>
        </div>
      </div>
    </footer>
  );
}
