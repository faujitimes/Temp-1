import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  type?: "website" | "article";
  jsonLd?: Record<string, unknown>;
}

function upsertMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export function SEOHead({
  title,
  description,
  type = "website",
  jsonLd,
}: SEOHeadProps) {
  useEffect(() => {
    const fullTitle = title.includes("Faujitimes")
      ? title
      : `${title} – Faujitimes`;
    document.title = fullTitle;

    const cleanDesc = description.slice(0, 160);
    const canonicalUrl = window.location.origin + window.location.pathname;

    upsertMeta("name", "description", cleanDesc);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", cleanDesc);
    upsertMeta("property", "og:url", canonicalUrl);
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", cleanDesc);

    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute("href", canonicalUrl);

    const existingScript = document.getElementById("dynamic-seo-jsonld");
    if (jsonLd) {
      const script = existingScript || document.createElement("script");
      script.id = "dynamic-seo-jsonld";
      script.setAttribute("type", "application/ld+json");
      script.textContent = JSON.stringify(jsonLd);
      if (!existingScript) {
        document.head.appendChild(script);
      }
    } else if (existingScript) {
      existingScript.remove();
    }
  }, [title, description, type, jsonLd]);

  return null;
}
