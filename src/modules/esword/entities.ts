/**
 * Los módulos de e-Sword (sobre todo comentarios) guardan el texto con
 * entidades HTML en vez de caracteres reales: "&nbsp;Nos ajustaremos&hellip;",
 * "&uacute;nico", "&laquo;En el principio&raquo;". Sin convertirlas se ven
 * los "&nbsp;" y las "&oacute;" tal cual.
 */

const NAMED: Record<string, string> = {
  nbsp: " ", ensp: " ", emsp: " ", thinsp: " ", shy: "",
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  laquo: "«", raquo: "»", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’",
  hellip: "…", mdash: "—", ndash: "–", minus: "−", middot: "·",
  bull: "•", deg: "°", plusmn: "±", frac12: "½", frac14: "¼", times: "×",
  copy: "©", reg: "®", trade: "™", sect: "§", para: "¶", dagger: "†",
  iquest: "¿", iexcl: "¡", curren: "¤",
  eacute: "é", egrave: "è", ecirc: "ê", euml: "ë", aacute: "á", agrave: "à",
  acirc: "â", auml: "ä", atilde: "ã", aring: "å", iacute: "í", igrave: "ì",
  icirc: "î", iuml: "ï", oacute: "ó", ograve: "ò", ocirc: "ô", ouml: "ö",
  otilde: "õ", uacute: "ú", ugrave: "ù", ucirc: "û", uuml: "ü", ntilde: "ñ",
  ccedil: "ç", yacute: "ý", yuml: "ÿ",
  Eacute: "É", Egrave: "È", Ecirc: "Ê", Euml: "Ë", Aacute: "Á", Agrave: "À",
  Acirc: "Â", Auml: "Ä", Atilde: "Ã", Aring: "Å", Iacute: "Í", Igrave: "Ì",
  Icirc: "Î", Iuml: "Ï", Oacute: "Ó", Ograve: "Ò", Ocirc: "Ô", Ouml: "Ö",
  Otilde: "Õ", Uacute: "Ú", Ugrave: "Ù", Ucirc: "Û", Uuml: "Ü", Ntilde: "Ñ",
  Ccedil: "Ç", Yacute: "Ý",
};

/** Convierte "&nbsp;", "&uacute;", "&#8230;", "&#x2026;" y "&hellip;" a texto real. */
export function decodeEntities(text: string): string {
  if (!text || text.indexOf("&") === -1) return text;
  return text.replace(/&(#[0-9]+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{1,9});/g, (whole, body: string) => {
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X"
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code < 1 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    const hit = NAMED[body];
    return hit === undefined ? whole : hit;
  });
}
