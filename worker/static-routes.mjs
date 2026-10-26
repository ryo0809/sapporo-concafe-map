// Only build-time pages with no D1/session data. The home shell loads cafes separately.
export const staticRoutes={
  '/':{source:'index.html',type:'text/html; charset=utf-8'},
  '/contact':{source:'contact.html',type:'text/html; charset=utf-8'},
  '/privacy':{source:'privacy.html',type:'text/html; charset=utf-8'},
  '/listing-information':{source:'listing-information.html',type:'text/html; charset=utf-8'},
  '/admin/login':{source:'admin/login.html',type:'text/html; charset=utf-8',private:true},
  '/robots.txt':{source:'robots.txt.body',type:'text/plain; charset=utf-8'},
  '/sitemap.xml':{source:'sitemap.xml.body',type:'application/xml; charset=utf-8'},
  '/icon.svg':{source:'icon.svg.body',type:'image/svg+xml'},
  '/apple-icon':{source:'apple-icon.body',type:'image/png'},
  '/social-card.png':{source:'social-card.png.body',type:'image/png'},
};
