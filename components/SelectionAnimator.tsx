/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useEffect, useState, useRef } from 'react';
import type { Rect } from '../types';

interface SelectionAnimatorProps {
    rect: Rect;
    finalRect: Rect;
    src: string;
    onComplete: () => void;
}

export const SelectionAnimator: React.FC<SelectionAnimatorProps> = ({ rect, finalRect, src, onComplete }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const onCompleteCalled = useRef(false);

    useEffect(() => {
        // Timeout to allow the element to mount before adding the animation class
        const timer = setTimeout(() => setIsAnimating(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const handleTransitionEnd = () => {
        if (!onCompleteCalled.current) {
            onCompleteCalled.current = true;
            onComplete();
        }
    };
    
    const initialStyle: React.CSSProperties = {
        top: `${rect.y}px`,
        left: `${rect.x}px`,
        width: `${rect.w}px`,
        height: `${rect.h}px`,
    };

    const finalStyle: React.CSSProperties = {
        top: `${finalRect.y}px`,
        left: `${finalRect.x}px`,
        width: `${finalRect.w}px`,
        height: `${finalRect.h}px`,
    };

    return (
        <div
            style={isAnimating ? finalStyle : initialStyle}
            className="absolute transition-all duration-700 ease-in-out cursor-progress"
            onTransitionEnd={handleTransitionEnd}
        >
            <img 
                src={src} 
                alt="Enhancing selection"
                className="w-full h-full pixelated"
            />
        </div>
    );
}
