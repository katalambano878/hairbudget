'use client';

import React, { useState } from 'react';
import Image from 'next/image';

interface PageHeroProps {
    title: string;
    subtitle?: string;
    backgroundImage?: string;
}

export default function PageHero({ title, subtitle, backgroundImage }: PageHeroProps) {
    const [imgError, setImgError] = useState(false);
    const showImage = backgroundImage && !imgError;

    return (
        <div className={`relative overflow-hidden flex items-center justify-center min-h-[60vh] bg-slate-900`}>
            {showImage && (
                <>
                    <Image
                        src={backgroundImage}
                        alt={title}
                        fill
                        className="object-cover"
                        priority
                        sizes="100vw"
                        quality={82}
                        onError={() => setImgError(true)}
                    />
                    <div className="absolute inset-0 bg-black/50" />
                </>
            )}

            {/* Fallback texture (shown when no image or image fails) */}
            {!showImage && (
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
                    <div className="absolute inset-0 opacity-[0.07] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/30 to-transparent" />
                </div>
            )}

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center z-10 flex flex-col items-center">
                <div className="mb-6">
                    <span className="inline-block py-1 px-4 text-white/90 text-sm tracking-[0.3em] uppercase font-semibold border border-white/20 rounded-full backdrop-blur-md bg-white/5">
                        {title.split(' ')[0]} Collection
                    </span>
                </div>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif italic font-medium text-white mb-8 leading-[1.1] drop-shadow-2xl">
                    {title}
                </h1>

                {subtitle && (
                    <p className="text-lg md:text-2xl text-slate-50/90 max-w-2xl mx-auto leading-relaxed font-light drop-shadow-lg">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
