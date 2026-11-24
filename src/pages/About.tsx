import { Info, ShieldCheck, Target, Users } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { SEOHead } from "../components/SEOHead";

export function About() {
  const { customTexts } = useContent();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full py-12">
      <SEOHead
        title="About Faujitimes"
        description={
          customTexts.about_mission ||
          "Faujitimes is a centralized awareness platform developed for Ex-Servicemen, their widows, and dependents."
        }
      />
      <div className="text-center mb-12">
        <h1 className="text-4xl font-serif font-bold text-veteran-navy flex items-center justify-center gap-3 mb-4">
          <Info className="w-8 h-8 text-veteran-olive" />
          {customTexts.about_title || "About Faujitimes"}
        </h1>
        <div className="w-24 h-1 bg-veteran-gold mx-auto rounded"></div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-10 prose max-w-none prose-p:text-gray-600 prose-headings:text-veteran-navy prose-headings:font-serif">
        <p className="lead text-lg font-medium text-gray-700">
          {customTexts.about_mission || "Faujitimes is a centralized awareness platform developed for the exclusive benefit of Ex-Servicemen (ESM), their widows, and dependents."}
        </p>
        <p>
          Our mission is to bridge the communication gap between government welfare organizations (like the Kendriya Sainik Board, Directorate General of Resettlement, and ECHS) and the veteran community. We ensure that every official circular, policy update, and welfare scheme reaches our veterans promptly and accurately.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-10">
          <div className="text-center">
             <div className="mx-auto w-16 h-16 bg-blue-50 text-veteran-navy rounded-full flex items-center justify-center mb-4">
               <ShieldCheck className="w-8 h-8" />
             </div>
             <h3 className="font-bold mb-2">Authentic Information</h3>
             <p className="text-sm">Directly published orders and official circulars to avoid misinformation.</p>
          </div>
          <div className="text-center">
             <div className="mx-auto w-16 h-16 bg-green-50 text-veteran-olive rounded-full flex items-center justify-center mb-4">
               <Target className="w-8 h-8" />
             </div>
             <h3 className="font-bold mb-2">Focused Resettlement</h3>
             <p className="text-sm">Highlighting job opportunities and resettlement schemes for a second career.</p>
          </div>
          <div className="text-center">
             <div className="mx-auto w-16 h-16 bg-red-50 text-veteran-maroon rounded-full flex items-center justify-center mb-4">
               <Users className="w-8 h-8" />
             </div>
             <h3 className="font-bold mb-2">Community Support</h3>
             <p className="text-sm">Keep updated with veteran rallies, medical camps, and local news.</p>
          </div>
        </div>

        <h2>Vision</h2>
        <p>
          To create a dignified, digital, and seamlessly connected environment where the veteran community is well-informed, respected, and empowered to avail their rightful benefits. We salute the sacrifices made by our Armed Forces, and this portal is a small step towards returning their service with ours.
        </p>
      </div>
    </div>
  );
}
