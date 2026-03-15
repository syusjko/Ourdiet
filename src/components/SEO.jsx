import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, url, image }) {
    const siteTitle = 'OurDiet';
    const finalTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    const desc = description || 'The same calorie deficit science behind Wegovy & Ozempic. AI-powered meal tracking and group accountability to help you stay on track.';
    const finalUrl = url ? `https://ourdiet.vercel.app${url}` : 'https://ourdiet.vercel.app';
    const finalImage = image || 'https://ourdiet.vercel.app/og-image.png'; // Make sure to add a real og-image.png later
    
    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{finalTitle}</title>
            <meta name="description" content={desc} />
            
            {/* Open Graph tags (Facebook, LinkedIn, Slack) */}
            <meta property="og:title" content={finalTitle} />
            <meta property="og:description" content={desc} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={finalUrl} />
            <meta property="og:image" content={finalImage} />
            
            {/* Twitter Card tags */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={finalTitle} />
            <meta name="twitter:description" content={desc} />
            <meta name="twitter:image" content={finalImage} />
        </Helmet>
    );
}
