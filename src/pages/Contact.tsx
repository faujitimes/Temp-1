import React, { useState } from "react";
import { Phone, Mail, MapPin, Send } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { SEOHead } from "../components/SEOHead";

export function Contact() {
  const { customTexts } = useContent();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-12">
      <SEOHead
        title="Contact Us"
        description="Contact Faujitimes Ex-Servicemen Welfare Information Portal for queries related to government circulars, SPARSH pension, ECHS, or welfare schemes."
      />
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-serif font-bold text-veteran-navy mb-4">Contact Us</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          We are here to assist you. Please reach out to us or use the form below for any queries related to circulars, ECHS, or welfare schemes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        
        {/* Contact Info */}
        <div className="bg-veteran-navy text-white p-10 flex flex-col justify-center relative">
          <div className="absolute inset-0 bg-veteran-navy-light/20"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-serif font-bold mb-8 text-veteran-gold">Board Headquarters</h2>
            
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-veteran-gold shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg">Address</h3>
                  <p className="text-gray-300 mt-1">{customTexts.contact_address || "175, Ashram Road, Budhpur Delhi 110036"}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Phone className="w-6 h-6 text-veteran-gold shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg">Telephone</h3>
                  <p className="text-gray-300 mt-1">{customTexts.contact_phone || "01127206062"}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 text-veteran-gold shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg">Email</h3>
                  <p className="text-gray-300 mt-1">{customTexts.contact_email || "faujitimes@gmail.com"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="p-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Send a Message</h2>
          
          {submitted ? (
            <div className="bg-green-50 text-green-800 p-6 rounded-lg text-center border border-green-200">
              <p className="font-medium text-lg mb-2">Message Sent Successfully!</p>
              <p className="text-sm">We have received your query and will respond shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Number (Optional)</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-veteran-olive focus:border-veteran-olive outline-none" placeholder="e.g. JC-123456" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" required className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-veteran-olive focus:border-veteran-olive outline-none" placeholder="Your Name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input type="email" required className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-veteran-olive focus:border-veteran-olive outline-none" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea required rows={4} className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-veteran-olive focus:border-veteran-olive outline-none resize-none" placeholder="How can we help you?"></textarea>
              </div>
              <button type="submit" className="w-full bg-veteran-navy hover:bg-veteran-navy-light text-white font-bold py-3 px-4 rounded shadow flex justify-center items-center gap-2 transition-colors">
                Submit Query <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
        
      </div>
    </div>
  );
}
