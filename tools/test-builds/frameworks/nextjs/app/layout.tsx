export const metadata = {
  title: 'Next.js Framework Test'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta httpEquiv="X-UA-Compatible" content="ie=edge" />
      </head>
      <body>
        <div id="app">{children}</div>
      </body>
    </html>
  )
}
