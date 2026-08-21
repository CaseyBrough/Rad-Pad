import { Html, Head, Main, NextScript } from 'next/document'

// Global, static <head> tags that shouldn't be duplicated per-page - mainly
// here to make "Add to Home Screen" on iOS use our icon/name and open as a
// standalone app instead of a Safari tab.
export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/icons/favicon-16.png" sizes="16x16" type="image/png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#0D0A0E" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Rad Pad" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
