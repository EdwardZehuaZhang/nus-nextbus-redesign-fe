import { ScrollViewStyleReset } from 'expo-router/html';

// This file is web-only and used to configure the root HTML for every
// web page during static rendering.
// The contents of this function only run in Node.js environments and
// do not have access to the DOM or browser APIs.
export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/*
          This viewport disables scaling which makes the mobile website act more like a native app.
          However this does reduce built-in accessibility. If you want to enable scaling, use this instead:
            <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        */}
        <meta
          name="viewport"
          content="width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1.00001,viewport-fit=cover"
        />

        {/* Early patch: upgrade ws:// to wss:// when page is served over HTTPS */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    const w = window as any;
    if (!w || !w.location || typeof w.WebSocket === 'undefined') return;
    const isHttps = w.location.protocol === 'https:';
    if (!isHttps) return;
    const NativeWS = w.WebSocket;
    const Wrap = function(url: string | URL, protocols?: string | string[]) {
      let u = typeof url === 'string' ? url : url.toString();
      if (/^ws:\/\//i.test(u)) u = u.replace(/^ws:\/\//i, 'wss://');
      if (/^https?:\/\//i.test(u)) u = u.replace(/^https?:\/\//i, 'wss://');
      if (/^\/\//.test(u)) u = 'wss:' + u;
      if (/^\//.test(u)) u = 'wss://' + w.location.host + u;
      if (!/^wss?:\/\//i.test(u)) u = 'wss://' + w.location.host + '/' + u.replace(/^\//, '');
      // @ts-ignore
      return new NativeWS(u, protocols);
    } as unknown as typeof WebSocket;
    // Copy static props
    Object.getOwnPropertyNames(NativeWS).forEach((k) => {
      try { (Wrap as any)[k] = (NativeWS as any)[k]; } catch (_) {}
    });
    Wrap.prototype = NativeWS.prototype;
    w.WebSocket = Wrap;
  } catch (_) {}
})();`,
          }}
        />

        {/*
          Disable body scrolling on web. This makes ScrollView components work closer to how they do on native.
          However, body scrolling is often nice to have for mobile web. If you want to enable it, remove this line.
        */}
        <ScrollViewStyleReset />

        {/* Using raw CSS styles as an escape-hatch to ensure the background color never flickers in dark-mode. */}
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {/* Add any additional <head> elements that you want globally available on web... */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #fff;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;
