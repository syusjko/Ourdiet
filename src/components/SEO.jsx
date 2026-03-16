import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, url, image }) {
    const siteTitle = 'OurDiet';
    const finalTitle = title ? `${title} | ${siteTitle}` : `AI Calorie Counter & Meal Tracker | ${siteTitle}`;
    const desc = description || 'Track calories instantly with AI. OurDiet uses the same calorie deficit science as Wegovy & Ozempic to help you lose weight without magic pills. Start your AI-powered meal tracking journey today.';
    const finalUrl = url ? `https://www.advisorapi.io${url}` : 'https://www.advisorapi.io/';
    const finalImage = image || 'https://www.advisorapi.io/og-image.png';
    
    const jsonLd = [
        {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "OurDiet",
            "url": "https://www.advisorapi.io/"
        },
        {
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
            "description": "AI-powered calorie counter and meal tracking application designed for calorie deficit management.",
            "featureList": "AI Food Recognition, Weight Tracking, Group Accountability, Calorie Deficit Calculator",
            "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "120"
            }
        }
    ];

    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{finalTitle}</title>
            <meta name="description" content={desc} />
            <meta name="keywords" content="AI Calorie Counter, AI Meal Tracker, Calorie Deficit App, AI Nutrition Analysis, Weight Loss App" />
            
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
