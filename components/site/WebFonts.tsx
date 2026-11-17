"use client";

import { Gaegu, Jua } from "next/font/google";
import "@/app/web-decoration.css";

const gaegu = Gaegu({ variable: "--font-crayon", subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false });
const jua = Jua({ variable: "--font-jua", subsets: ["latin"], weight: "400", display: "swap", preload: false });

/** Keep the existing web typography, including bare authentication screens,
 * without putting its font CSS on the native app's first render path. */
export default function WebFonts() {
    return <style>{`:root{--font-crayon:${gaegu.style.fontFamily};--font-jua:${jua.style.fontFamily}}`}</style>;
}
