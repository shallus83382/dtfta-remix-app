/**
 * Client-safe mapping from productKey to design asset URLs (-front/-back).
 * Base URL is injected at build/dev time via Vite `define` (see `vite.config.ts`, env `AWS_COULD_FRONT_URL`).
 */
const APP_ASSET_BASE = __DTFTA_ASSET_BASE__;

export const PRODUCT_KEY_TO_DESIGN_ASSET_BASE: Record<string, string> = {
  "nl-6210": "unisex-tee",
  "nl-3601": "long-sleeve-tee",
  "gd-18500": "heavy-blend-hoodie",
  "ch-m2650ch": "heavyweight-hoodie",
};


export const PRODUCT_KEY_TO_DESIGN_ASSET: Record<string, Record<string, string>> = {
  default: {
    unisex_tee: "assets/customizer/product/unisex-tee.png",
    long_sleeve_tee: "assets/customizer/product/long-sleeve-tee.png",
    heavyweight_hoodie: "assets/customizer/product/heavyweight-hoodie.png",
    heavy_blend_hoodie: "assets/customizer/product/heavy-blend-hoodie.png",

    unisex_tee_front: "assets/customizer/front/unisex-tee-front.png",
    long_sleeve_tee_front: "assets/customizer/front/long-sleeve-tee-front.png",
    heavyweight_hoodie_front: "assets/customizer/front/heavyweight-hoodie-front.png",
    heavy_blend_hoodie_front: "assets/customizer/front/heavy-blend-hoodie-front.png",

    unisex_tee_back: "assets/customizer/back/unisex-tee-back.png",
    long_sleeve_tee_back: "assets/customizer/back/long-sleeve-tee-back.png",
    heavyweight_hoodie_back: "assets/customizer/back/heavyweight-hoodie-back.png",
    heavy_blend_hoodie_back: "assets/customizer/back/heavy-blend-hoodie-back.png",
  },

  red: {
    unisex_tee_front: "assets/customizer/red/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/red/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/red/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/red/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/red/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/red/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/red/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/red/back/heavy-blend-hoodie-back.png",
  },

  black: {
    unisex_tee_front: "assets/customizer/black/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/black/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/black/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/black/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/black/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/black/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/black/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/black/back/heavy-blend-hoodie-back.png",
  },

  white: {
    unisex_tee_front: "assets/customizer/white/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/white/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/white/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/white/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/white/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/white/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/white/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/white/back/heavy-blend-hoodie-back.png",
  },

  brown: {
    unisex_tee_front: "assets/customizer/brown/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/brown/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/brown/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/brown/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/brown/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/brown/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/brown/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/brown/back/heavy-blend-hoodie-back.png",
  },

  green: {
    unisex_tee_front: "assets/customizer/green/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/green/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/green/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/green/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/green/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/green/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/green/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/green/back/heavy-blend-hoodie-back.png",
  },
  blue: {
    unisex_tee_front: "assets/customizer/blue/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/blue/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/blue/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/blue/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/blue/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/blue/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/blue/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/blue/back/heavy-blend-hoodie-back.png",
  },
  orange: {
    unisex_tee_front: "assets/customizer/orange/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/orange/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/orange/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/orange/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/orange/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/orange/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/orange/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/orange/back/heavy-blend-hoodie-back.png",
  },
  clay:{
    unisex_tee_front: "assets/customizer/clay/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/clay/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/clay/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/clay/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/clay/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/clay/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/clay/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/clay/back/heavy-blend-hoodie-back.png",
  },
  antique_gold:{
    unisex_tee_front: "assets/customizer/antique_gold/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/antique_gold/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/antique_gold/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/antique_gold/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/antique_gold/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/antique_gold/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/antique_gold/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/antique_gold/back/heavy-blend-hoodie-back.png",
  },
  banana_cream:{
    unisex_tee_front: "assets/customizer/banana_cream/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/banana_cream/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/banana_cream/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/banana_cream/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/banana_cream/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/banana_cream/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/banana_cream/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/banana_cream/back/heavy-blend-hoodie-back.png",
  },
  blue_jean:{
    unisex_tee_front: "assets/customizer/blue_jean/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/blue_jean/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/blue_jean/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/blue_jean/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/blue_jean/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/blue_jean/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/blue_jean/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/blue_jean/back/heavy-blend-hoodie-back.png",
  },
  bone:{
    unisex_tee_front: "assets/customizer/bone/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/bone/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/bone/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/bone/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/bone/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/bone/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/bone/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/bone/back/heavy-blend-hoodie-back.png",
  },
  cardinal:{
    unisex_tee_front: "assets/customizer/cardinal/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/cardinal/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/cardinal/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/cardinal/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/cardinal/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/cardinal/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/cardinal/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/cardinal/back/heavy-blend-hoodie-back.png",
  },
  classic_orange:{
    unisex_tee_front: "assets/customizer/classic_orange/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/classic_orange/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/classic_orange/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/classic_orange/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/classic_orange/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/classic_orange/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/classic_orange/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/classic_orange/back/heavy-blend-hoodie-back.png",
  },
  cool_blue:{
    unisex_tee_front: "assets/customizer/cool_blue/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/cool_blue/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/cool_blue/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/cool_blue/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/cool_blue/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/cool_blue/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/cool_blue/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/cool_blue/back/heavy-blend-hoodie-back.png",
  },
  cream:{
    unisex_tee_front: "assets/customizer/cream/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/cream/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/cream/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/cream/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/cream/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/cream/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/cream/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/cream/back/heavy-blend-hoodie-back.png",
  },
  dark_chocholate:{
    unisex_tee_front: "assets/customizer/dark_chocholate/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/dark_chocholate/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/dark_chocholate/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/dark_chocholate/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/dark_chocholate/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/dark_chocholate/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/dark_chocholate/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/dark_chocholate/back/heavy-blend-hoodie-back.png",
  },
  desert_pink:{
    unisex_tee_front: "assets/customizer/desert_pink/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/desert_pink/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/desert_pink/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/desert_pink/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/desert_pink/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/desert_pink/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/desert_pink/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/desert_pink/back/heavy-blend-hoodie-back.png",
  },
  forest_green:{
    unisex_tee_front: "assets/customizer/forest_green/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/forest_green/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/forest_green/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/forest_green/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/forest_green/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/forest_green/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/forest_green/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/forest_green/back/heavy-blend-hoodie-back.png",
  },
  gold:{
    unisex_tee_front: "assets/customizer/gold/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/gold/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/gold/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/gold/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/gold/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/gold/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/gold/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/gold/back/heavy-blend-hoodie-back.png",
  },
  graphite_black:{
    unisex_tee_front: "assets/customizer/graphite_black/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/graphite_black/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/graphite_black/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/graphite_black/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/graphite_black/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/graphite_black/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/graphite_black/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/graphite_black/back/heavy-blend-hoodie-back.png",
  },
  heather_gray:{
    unisex_tee_front: "assets/customizer/heather_gray/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/heather_gray/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/heather_gray/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/heather_gray/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/heather_gray/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/heather_gray/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/heather_gray/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/heather_gray/back/heavy-blend-hoodie-back.png",
  },
  heavy_metal:{
    unisex_tee_front: "assets/customizer/heavy_metal/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/heavy_metal/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/heavy_metal/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/heavy_metal/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/heavy_metal/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/heavy_metal/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/heavy_metal/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/heavy_metal/back/heavy-blend-hoodie-back.png",
  },
  indigo:{
    unisex_tee_front: "assets/customizer/indigo/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/indigo/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/indigo/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/indigo/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/indigo/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/indigo/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/indigo/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/indigo/back/heavy-blend-hoodie-back.png",
  },
  kelly_green:{
    unisex_tee_front: "assets/customizer/kelly_green/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/kelly_green/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/kelly_green/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/kelly_green/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/kelly_green/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/kelly_green/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/kelly_green/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/kelly_green/back/heavy-blend-hoodie-back.png",
  },
  light_blue:{
    unisex_tee_front: "assets/customizer/light_blue/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/light_blue/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/light_blue/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/light_blue/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/light_blue/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/light_blue/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/light_blue/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/light_blue/back/heavy-blend-hoodie-back.png",
  },
  light_grey:{
    unisex_tee_front: "assets/customizer/light_gray/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/light_gray/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/light_gray/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/light_gray/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/light_gray/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/light_gray/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/light_gray/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/light_gray/back/heavy-blend-hoodie-back.png",
  },
  light_olive:{
    unisex_tee_front: "assets/customizer/light_olive/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/light_olive/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/light_olive/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/light_olive/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/light_olive/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/light_olive/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/light_olive/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/light_olive/back/heavy-blend-hoodie-back.png",
  },
  light_pink:{
    unisex_tee_front: "assets/customizer/light_pink/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/light_pink/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/light_pink/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/light_pink/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/light_pink/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/light_pink/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/light_pink/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/light_pink/back/heavy-blend-hoodie-back.png",
  },
  maroon:{
    unisex_tee_front: "assets/customizer/maroon/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/maroon/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/maroon/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/maroon/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/maroon/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/maroon/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/maroon/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/maroon/back/heavy-blend-hoodie-back.png",
  },
  mauve:{
    unisex_tee_front: "assets/customizer/mauve/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/mauve/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/mauve/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/mauve/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/mauve/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/mauve/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/mauve/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/mauve/back/heavy-blend-hoodie-back.png",
  },
  midnight_navy:{
    unisex_tee_front: "assets/customizer/midnight_navy/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/midnight_navy/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/midnight_navy/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/midnight_navy/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/midnight_navy/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/midnight_navy/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/midnight_navy/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/midnight_navy/back/heavy-blend-hoodie-back.png",
  },
  military_green:{
    unisex_tee_front: "assets/customizer/military_green/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/military_green/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/military_green/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/military_green/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/military_green/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/military_green/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/military_green/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/military_green/back/heavy-blend-hoodie-back.png",
  },
  natural:{
    unisex_tee_front: "assets/customizer/natural/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/natural/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/natural/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/natural/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/natural/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/natural/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/natural/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/natural/back/heavy-blend-hoodie-back.png",
  },
  oatmeaL:{
    unisex_tee_front: "assets/customizer/oatmeaL/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/oatmeaL/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/oatmeaL/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/oatmeaL/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/oatmeaL/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/oatmeaL/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/oatmeaL/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/oatmeaL/back/heavy-blend-hoodie-back.png",
  },
  oxblood:{
    unisex_tee_front: "assets/customizer/oxblood/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/oxblood/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/oxblood/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/oxblood/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/oxblood/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/oxblood/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/oxblood/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/oxblood/back/heavy-blend-hoodie-back.png",
  },
  periblue:{
    unisex_tee_front: "assets/customizer/periblue/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/periblue/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/periblue/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/periblue/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/periblue/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/periblue/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/periblue/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/periblue/back/heavy-blend-hoodie-back.png",
  },
  purple_rush:{
    unisex_tee_front: "assets/customizer/purple_rush/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/purple_rush/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/purple_rush/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/purple_rush/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/purple_rush/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/purple_rush/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/purple_rush/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/purple_rush/back/heavy-blend-hoodie-back.png",
  },
  royal:{
    unisex_tee_front: "assets/customizer/royal/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/royal/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/royal/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/royal/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/royal/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/royal/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/royal/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/royal/back/heavy-blend-hoodie-back.png",
  },
  royal_pine:{
    unisex_tee_front: "assets/customizer/royal_pine/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/royal_pine/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/royal_pine/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/royal_pine/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/royal_pine/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/royal_pine/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/royal_pine/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/royal_pine/back/heavy-blend-hoodie-back.png",
  },
  sand:{
    unisex_tee_front: "assets/customizer/sand/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/sand/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/sand/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/sand/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/sand/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/sand/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/sand/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/sand/back/heavy-blend-hoodie-back.png",
  },
  shiitake:{
    unisex_tee_front: "assets/customizer/shiitake/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/shiitake/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/shiitake/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/shiitake/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/shiitake/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/shiitake/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/shiitake/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/shiitake/back/heavy-blend-hoodie-back.png",
  },
  stonewash_denim:{
    unisex_tee_front: "assets/customizer/stonewash_denim/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/stonewash_denim/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/stonewash_denim/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/stonewash_denim/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/stonewash_denim/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/stonewash_denim/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/stonewash_denim/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/stonewash_denim/back/heavy-blend-hoodie-back.png",
  },
  tahiti_blue:{
    unisex_tee_front: "assets/customizer/tahiti_blue/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/tahiti_blue/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/tahiti_blue/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/tahiti_blue/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/tahiti_blue/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/tahiti_blue/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/tahiti_blue/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/tahiti_blue/back/heavy-blend-hoodie-back.png",
  },
  tan:{
    unisex_tee_front: "assets/customizer/tan/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/tan/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/tan/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/tan/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/tan/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/tan/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/tan/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/tan/back/heavy-blend-hoodie-back.png",
  },
  teal:{
    unisex_tee_front: "assets/customizer/teal/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/teal/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/teal/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/teal/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/teal/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/teal/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/teal/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/teal/back/heavy-blend-hoodie-back.png",
  },
  turquoise:{
    unisex_tee_front: "assets/customizer/turquoise/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/turquoise/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/turquoise/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/turquoise/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/turquoise/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/turquoise/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/turquoise/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/turquoise/back/heavy-blend-hoodie-back.png",
  },
  warm_gray:{
    unisex_tee_front: "assets/customizer/warm_gray/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/warm_gray/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/warm_gray/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/warm_gray/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/warm_gray/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/warm_gray/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/warm_gray/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/warm_gray/back/heavy-blend-hoodie-back.png",
  },
  watermelon:{
    unisex_tee_front: "assets/customizer/watermelon/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/watermelon/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/watermelon/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/watermelon/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/watermelon/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/watermelon/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/watermelon/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/watermelon/back/heavy-blend-hoodie-back.png",
  },
  hot_pink:{
    unisex_tee_front: "assets/customizer/hot_pink/front/unisex-tee-front.png",
    unisex_tee_back: "assets/customizer/hot_pink/back/unisex-tee-back.png",

    long_sleeve_tee_front: "assets/customizer/hot_pink/front/long-sleeve-tee-front.png",
    long_sleeve_tee_back: "assets/customizer/hot_pink/back/long-sleeve-tee-back.png",

    heavyweight_hoodie_front: "assets/customizer/hot_pink/front/heavyweight-hoodie-front.png",
    heavyweight_hoodie_back: "assets/customizer/hot_pink/back/heavyweight-hoodie-back.png",

    heavy_blend_hoodie_front: "assets/customizer/hot_pink/front/heavy-blend-hoodie-front.png",
    heavy_blend_hoodie_back: "assets/customizer/hot_pink/back/heavy-blend-hoodie-back.png",
  }
};


export type DesignPlacement = "front" | "back";

/**
 * Resolve the product image URL for the customizer canvas (1000x1000 -front/-back assets).
 * Returns e.g. /assets/unisex-tee-front.jpg or /assets/unisex-tee-back.jpg.
 */
export function mapColorToAssetCategory(color?: string): string {
  const value = color?.trim().toLowerCase();

  switch (value) {
    case "red":
    case "rd":
      return "red";

    case "black":
    case "blk":
      return "black";

    case "white":
    case "wht":
      return "white";

    case "brown":
    case "brn":
      return "brown";

    case "green":
    case "grn":
      return "green";

    case "blue":
    case "blu":
      return "blue";

    case "orange":
    case "org":
      return "orange";
     
      case "clay":   
      case "antique_gold":   
      case "banana_cream":   
      case "blue_jean":   
      case "bone":   
      case "cardinal":   
      case "classic_orange":   
      case "cool_blue":   
      case "cream":   
      case "dark_chocholate":   
      case "desert_pink":   
      case "forest_green":   
      case "gold":   
      case "graphite_black":   
      case "heather_gray":   
      case "heavy_metal":   
      case "indigo":   
      case "kelly_green":   
      case "light_blue":   
      case "light_grey":   
      case "light_olive":   
      case "light_pink":   
      case "maroon":   
      case "mauve":   
      case "midnight_navy":   
      case "military_green":   
      case "natural":   
      case "oatmeaL":   
      case "oxblood":   
      case "periblue":   
      case "purple_rush":   
      case "royal":   
      case "royal_pine":   
      case "sand":   
      case "shiitake":   
      case "stonewash_denim":   
      case "tahiti_blue":   
      case "tan":   
      case "teal":   
      case "turquoise":   
      case "watermelon":   
      case "hot_pink":
        return value;   


    default:
      return "default";
  }
}

/**
 * Existing flat asset-key resolver, now color-aware with default fallback.
 *
 * Example:
 * getProductDesignAssetUrl("heavy_blend_hoodie_back", "red")
 * -> /assets/customizer/red/back/heavy-blend-hoodie-back.jpg
 */
export function getProductDesignAssetUrl(assetKey: string, color?: string): string {
  const colorCategory = mapColorToAssetCategory(color);

  const colorAsset = PRODUCT_KEY_TO_DESIGN_ASSET[colorCategory]?.[assetKey];
  const fallbackAsset = PRODUCT_KEY_TO_DESIGN_ASSET.default?.[assetKey];
  const resolved = colorAsset || fallbackAsset;
  
  return resolved ? `${APP_ASSET_BASE}/${resolved}` : "";
}

const FABRIC_IMAGE_PROXY_PATH = "/app/api/artworks-image";

/**
 * Fabric / canvas APIs load images with `crossOrigin: "anonymous"`, which requires
 * ACAO from the image host. Our design CDN may not send CORS headers, so we load
 * catalog assets through the same-origin app proxy instead.
 *
 * Only URLs under the configured asset base are rewritten (not an open proxy).
 */
export function toProxiedFabricImageUrl(remoteUrl: string): string {
  const trimmed = remoteUrl.trim();
  if (!trimmed) return trimmed;
  const base = __DTFTA_ASSET_BASE__.replace(/\/+$/, "");
  if (trimmed.startsWith(`${base}/`) || trimmed === base) {
    return `${FABRIC_IMAGE_PROXY_PATH}?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

/** Catalog print-area background URL safe for Fabric (`fromURL` + export). */
export function getProductDesignAssetUrlForFabric(assetKey: string, color?: string): string {
  const remote = getProductDesignAssetUrl(assetKey, color);
  return remote ? toProxiedFabricImageUrl(remote) : "";
}

/**
 * Resolve product image by productKey + placement + optional color.
 * Useful when you do not already have selectedPrintArea.image.
 */
export function getDesignAssetUrl(
  productKey: string,
  placement: DesignPlacement,
  color?: string
): string {
  const base = PRODUCT_KEY_TO_DESIGN_ASSET_BASE[productKey] ?? "unisex_tee";
  const assetKey = `${base}_${placement}`;

  return getProductDesignAssetUrl(assetKey, color);
}
