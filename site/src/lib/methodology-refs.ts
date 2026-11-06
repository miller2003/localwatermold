// Numbered references for /methodology/. Order is the order of first citation on the page, so the
// numbers read [1], [2], [3] top to bottom. Cite them with <Cite k="key" /> (src/components/Cite.astro).

export interface Ref { key: string; text: string; url: string; kind: "dataset" | "article" | "standard" | "guidance" | "law" | "book" }

export const REFS: Ref[] = [
  { key: "ahs", kind: "dataset", text: "U.S. Census Bureau. American Housing Survey: housing quality, including water leakage from inside and outside the home in the prior 12 months (2019 survey).", url: "https://www.census.gov/content/dam/Census/library/visualizations/2021/demo/AHS-Housing%20Quality-FINAL.pdf" },
  { key: "acs", kind: "dataset", text: "U.S. Census Bureau. American Community Survey, 5-year estimates, 2020–2024. Tables B01002, B01003, B19013, B25001–B25003, B25024, B25034, B25035, B25040, B25077.", url: "https://www.census.gov/programs-surveys/acs/" },
  { key: "nclimgrid", kind: "dataset", text: "Durre, I., Squires, M. F., et al. (2022). NOAA nClimGrid-Daily Version 1: Daily gridded temperature and precipitation for the Contiguous United States since 1951. NOAA National Centers for Environmental Information. doi:10.25921/c4gt-r169", url: "https://www.ncei.noaa.gov/products/land-based-station/nclimgrid-daily" },
  { key: "tiger", kind: "dataset", text: "U.S. Census Bureau. TIGER/Line Shapefiles (county and place boundaries).", url: "https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html" },
  { key: "acsHandbook", kind: "guidance", text: "U.S. Census Bureau (2020). Understanding and Using American Community Survey Data: What All Data Users Need to Know. U.S. Government Publishing Office.", url: "https://www.census.gov/programs-surveys/acs/library/handbooks/general.html" },
  { key: "censusReporter", kind: "dataset", text: "Census Reporter. Open-source access to U.S. Census Bureau ACS tables and TIGER geographies.", url: "https://censusreporter.org/" },
  { key: "ghcnd", kind: "article", text: "Menne, M. J., Durre, I., Vose, R. S., Gleason, B. E., & Houston, T. G. (2012). An overview of the Global Historical Climatology Network-Daily database. Journal of Atmospheric and Oceanic Technology, 29(7), 897–910.", url: "https://doi.org/10.1175/JTECH-D-11-00103.1" },
  { key: "durre2022", kind: "article", text: "Durre, I., Arguez, A., Schreck, C. J., III, Squires, M. F., & Vose, R. S. (2022). Daily high-resolution temperature and precipitation fields for the contiguous United States from 1951 to present. Journal of Atmospheric and Oceanic Technology, 39(12), 1837–1855.", url: "https://doi.org/10.1175/JTECH-D-22-0024.1" },
  { key: "epinoaa", kind: "dataset", text: "NOAA and the North Carolina Institute for Climate Studies. nClimGrid-Daily county-level series (EpiNOAA v1.0.0), NOAA Open Data Dissemination on AWS.", url: "https://arc.ncics.org/nclimgrid-overview/" },
  { key: "normals", kind: "dataset", text: "NOAA National Centers for Environmental Information. U.S. Climate Normals, 1991–2020.", url: "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals" },
  { key: "etccdi", kind: "guidance", text: "Expert Team on Climate Change Detection and Indices (ETCCDI), WMO CCl / WCRP. Definitions of the 27 core climate indices.", url: "https://etccdi.pacificclimate.org/list_27_indices.shtml" },
  { key: "zhang2011", kind: "article", text: "Zhang, X., Alexander, L., Hegerl, G. C., Jones, P., Klein Tank, A., Peterson, T. C., Trewin, B., & Zwiers, F. W. (2011). Indices for monitoring changes in extremes based on daily temperature and precipitation data. WIREs Climate Change, 2(6), 851–870.", url: "https://doi.org/10.1002/wcc.147" },
  { key: "icc", kind: "guidance", text: "International Code Council (2014). Build it to code to minimize damage from frozen water pipes (citing the Insurance Institute for Business & Home Safety and University of Illinois Building Research Council field tests).", url: "https://media.iccsafe.org/news/eNews/2014v11n3/techsvcs.html" },
  { key: "fao56", kind: "book", text: "Allen, R. G., Pereira, L. S., Raes, D., & Smith, M. (1998). Crop Evapotranspiration: Guidelines for Computing Crop Water Requirements. FAO Irrigation and Drainage Paper 56. Food and Agriculture Organization of the United Nations.", url: "https://www.fao.org/4/x0490e/x0490e00.htm" },
  { key: "kimball1997", kind: "article", text: "Kimball, J. S., Running, S. W., & Nemani, R. (1997). An improved method for estimating surface humidity from daily minimum temperature. Agricultural and Forest Meteorology, 85(1–2), 87–98.", url: "https://doi.org/10.1016/S0168-1923(96)02366-0" },
  { key: "epaMold", kind: "guidance", text: "U.S. Environmental Protection Agency (2012). A Brief Guide to Mold, Moisture, and Your Home (EPA 402-K-02-003).", url: "https://www.epa.gov/mold/brief-guide-mold-moisture-and-your-home" },
  { key: "oecd2008", kind: "book", text: "OECD & European Commission Joint Research Centre (2008). Handbook on Constructing Composite Indicators: Methodology and User Guide. OECD Publishing.", url: "https://publications.jrc.ec.europa.eu/repository/handle/JRC47008" },
  { key: "svi", kind: "guidance", text: "Centers for Disease Control and Prevention / ATSDR. CDC/ATSDR Social Vulnerability Index: data documentation (percentile ranking within each state).", url: "https://svi.cdc.gov/" },
  { key: "spearman1904", kind: "article", text: "Spearman, C. (1904). The proof and measurement of association between two things. American Journal of Psychology, 15(1), 72–101.", url: "https://doi.org/10.2307/1412159" },
  { key: "broder1997", kind: "article", text: "Broder, A. Z. (1997). On the resemblance and containment of documents. Proceedings of Compression and Complexity of Sequences 1997, 21–29. IEEE.", url: "https://doi.org/10.1109/SEQUEN.1997.666900" },
  { key: "s500", kind: "standard", text: "Institute of Inspection, Cleaning and Restoration Certification (2021). ANSI/IICRC S500 Standard for Professional Water Damage Restoration, 5th ed.", url: "https://webstore.ansi.org/standards/iicrc/ansiiicrcs5002021" },
  { key: "s520", kind: "standard", text: "Institute of Inspection, Cleaning and Restoration Certification (2024). ANSI/IICRC S520 Standard for Professional Mold Remediation, 4th ed.", url: "https://iicrc.org/s520/" },
  { key: "ftc429", kind: "law", text: "Federal Trade Commission. Rule Concerning Cooling-Off Period for Sales Made at Homes or at Certain Other Locations, 16 CFR Part 429.", url: "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-D/part-429" },
  { key: "cdcMold", kind: "guidance", text: "Centers for Disease Control and Prevention. Mold and your health.", url: "https://www.cdc.gov/mold-health/" },
  { key: "naic", kind: "law", text: "National Association of Insurance Commissioners. Unfair Claims Settlement Practices Act (Model 900) and Model Regulation (Model 902).", url: "https://content.naic.org/model-laws" },
  { key: "robinson1950", kind: "article", text: "Robinson, W. S. (1950). Ecological correlations and the behavior of individuals. American Sociological Review, 15(3), 351–357.", url: "https://doi.org/10.2307/2087176" },
  { key: "ftc255", kind: "law", text: "Federal Trade Commission. Guides Concerning the Use of Endorsements and Testimonials in Advertising, 16 CFR Part 255.", url: "https://www.ecfr.gov/current/title-16/chapter-I/subchapter-B/part-255" },
];

export const refNumber = (key: string) => {
  const i = REFS.findIndex((r) => r.key === key);
  if (i < 0) throw new Error(`Unknown methodology reference "${key}"`);
  return i + 1;
};
