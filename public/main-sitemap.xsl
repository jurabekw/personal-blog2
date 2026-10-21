<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0"
  xmlns:html="http://www.w3.org/TR/REC-html40"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
        <meta name="robots" content="noindex,follow"/>
        <style type="text/css">
          body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #202020; margin: 0; background: #f0f2f5; }
          #content { margin: 0 auto; max-width: 1100px; padding: 32px 20px; }
          h1 { font-size: 24px; margin: 0 0 8px; }
          p.expl { color: #5e666e; margin: 0 0 20px; font-size: 14px; }
          p.expl a { color: #1cca59; }
          table { border-collapse: collapse; width: 100%; background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
          th { text-align: left; font-size: 12px; text-transform: uppercase; color: #7c858d; padding: 12px 16px; background: #fafafa; border-bottom: 1px solid #e5e7eb; }
          td { padding: 10px 16px; font-size: 14px; border-bottom: 1px solid #f0f2f5; }
          tr:last-child td { border-bottom: 0; }
          a { color: #202020; text-decoration: none; }
          a:hover { color: #1cca59; }
          .badge { display: inline-block; background: #1cca59; color: #fff; border-radius: 99px; padding: 2px 10px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div id="content">
          <h1>XML Sitemap</h1>
          <xsl:if test="count(sitemap:sitemapindex/sitemap:sitemap) &gt; 0">
            <p class="expl">This sitemap index contains <span class="badge"><xsl:value-of select="count(sitemap:sitemapindex/sitemap:sitemap)"/></span> sitemaps. It helps search engines like Google, Bing and Yandex discover every page.</p>
            <table>
              <tr><th width="75%">Sitemap</th><th width="25%">Last modified</th></tr>
              <xsl:for-each select="sitemap:sitemapindex/sitemap:sitemap">
                <tr>
                  <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                  <td><xsl:value-of select="concat(substring(sitemap:lastmod,0,11),concat(' ', substring(sitemap:lastmod,12,5)))"/></td>
                </tr>
              </xsl:for-each>
            </table>
          </xsl:if>
          <xsl:if test="count(sitemap:sitemapindex/sitemap:sitemap) &lt; 1">
            <p class="expl">This sitemap contains <span class="badge"><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></span> URLs. <a href="/sitemap_index.xml">← Sitemap index</a></p>
            <table>
              <tr><th width="70%">URL</th><th width="10%">Images</th><th width="20%">Last modified</th></tr>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                  <td><xsl:value-of select="count(image:image)"/></td>
                  <td><xsl:value-of select="concat(substring(sitemap:lastmod,0,11),concat(' ', substring(sitemap:lastmod,12,5)))"/></td>
                </tr>
              </xsl:for-each>
            </table>
          </xsl:if>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
