import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, url, image }) {
    const siteTitle = 'OurDiet';
    const finalTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    const desc = description || 'The same calorie deficit science behind Wegovy & Ozempic. AI-powered meal tracking and group accountability to help you stay on track. AI 칼로리 계산, 다이어트 앱, 식단 관리.';
    const finalUrl = url ? `https://www.advisorapi.io${url}` : 'https://www.advisorapi.io/';
    const finalImage = image || 'https://www.advisorapi.io/og-image.png';
    
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "OurDiet",
        "operatingSystem": "Web",
        "applicationCategory": "HealthApplication",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "description": desc,
        "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": "4.8",
            "ratingCount": "120"
        }
    };

    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{finalTitle}</title>
            <meta name="description" content={desc} />
            <meta name="keywords" content="AI 칼로리 계산, 다이어트 앱, 식단 관리, OurDiet, Calorie Tracker, Diet App" />
            
            {/* Open Graph tags */}
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={desc} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={finalUrl} />
            <meta property="og:image" content={finalImage} />
            <meta property="og:site_name" content={siteTitle} />
            
            {/* Twitter Card tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={finalTitle} />
            <meta name="twitter:description" content={desc} />
            <meta name="twitter:image" content={finalImage} />

            {/* Structured Data */}
            <script type="application/ld+json">
                {JSON.stringify(jsonLd)}
            </script>
        </Helmet>
    );
}
