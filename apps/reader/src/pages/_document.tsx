import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    // https://github.com/vercel/next.js/issues/10285
    // Next injects `<style data-next-hide-fouc="true">body{display:none}</style>`,
    // so we should set background on `html`
    <Html className="bg-default">
      <Head>
        <GoogleTagManager />
        <MicrosoftClarity />
        <link rel="icon" href="/icons/192.png"></link>
        <PWA />
        <PreventFlash />
      </Head>
      <body>
        <GoogleTagManagerNoScript />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}

function PWA() {
  return (
    <>
      <link rel="manifest" href="/manifest.json" />
      <meta id="theme-color" name="theme-color" content={background.light} />
      <link rel="apple-touch-icon" href="/icons/192.png" />
    </>
  )
}

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID

function GoogleTagManager() {
  if (!GTM_ID) return null
  return (
    // eslint-disable-next-line @next/next/next-script-for-ga
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer', '${GTM_ID}');
          `,
      }}
    />
  )
}

// Microsoft Clarity — session replay + heatmaps.
//
// The reader is the one surface the mobile Clarity SDK cannot record
// (it renders EPUB content inside a WebView, which the native SDKs skip),
// so capturing it here is what gives reading sessions any replay at all.
//
// Set NEXT_PUBLIC_CLARITY_PROJECT_ID to enable; unset = no script, so
// local dev and previews stay out of the data by default.
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID

function MicrosoftClarity() {
  if (!CLARITY_PROJECT_ID) return null
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
        `,
      }}
    />
  )
}

function GoogleTagManagerNoScript() {
  if (!GTM_ID) return null
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      ></iframe>
    </noscript>
  )
}

const background = {
  light: 'white',
  dark: '#24292e',
}

// external import in `_document.tsx` will break fast refresh,
// so move it to `_document.tsx`
function PreventFlash() {
  const setColorScheme = () => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const scheme = localStorage.getItem('literal-color-scheme') ?? 'system'

    if (scheme === '"dark"' || (scheme === '"system"' && mql.matches)) {
      document.documentElement.classList.toggle('dark', true)
      document
        .querySelector('#theme-color')
        ?.setAttribute('content', background.dark)
    }
  }

  return (
    <>
      <style>{`
        .bg-default, .hover\\:bg-default:hover {
          background: ${background.light};
        }
        .dark.bg-default, .dark .bg-default, .dark .hover\\:bg-default:hover {
          background: ${background.dark};
        }
      `}</style>
      <script
        dangerouslySetInnerHTML={{
          __html: `const background=${JSON.stringify(background)}`,
        }}
      ></script>
      <script
        dangerouslySetInnerHTML={{ __html: `(${setColorScheme})()` }}
      ></script>
    </>
  )
}
