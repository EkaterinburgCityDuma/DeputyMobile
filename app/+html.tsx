import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

export default function Root({ children }: { children: React.ReactNode }) {
    return (
        <html lang="ru">
        <head>
            <meta charSet="utf-8"/>
            <meta httpEquiv="X-UA-Compatible" content="IE=edge"/>
            <meta
                name="viewport"
                content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, shrink-to-fit=no, viewport-fit=cover"
            />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
            <meta name="theme-color" content="#ffffff" />
            <link rel="manifest" href="/pwa/manifest.json"/>
            <ScrollViewStyleReset/>

            <style dangerouslySetInnerHTML={{ __html: `
                html {
                    /* Ключевой фикс: минимальная высота = 100% + высота safe area сверху */
                    min-height: calc(100% + env(safe-area-inset-top));
                    
                    /* Заполняем safe areas со всех сторон */
                    padding: env(safe-area-inset-top) 
                             env(safe-area-inset-right) 
                             env(safe-area-inset-bottom) 
                             env(safe-area-inset-left);
                    
                    background-color: #ffffff;
                }
            
                body {
                    margin: 0;
                    padding: 0;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                    overscroll-behavior: none;
                    touch-action: none;
                    background-color: #ffffff;
                    -webkit-tap-highlight-color: transparent;
                }
            
                #root {
                    display: flex;
                    flex: 1;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }
            
                input, textarea, select {
                    font-size: 16px !important;
                }
            `}} />
        </head>
        <body>{children}</body>
        </html>
    );
}