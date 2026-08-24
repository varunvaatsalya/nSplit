"use client";

import React from "react";
import Link from "next/link";
import { Instagram, Linkedin, Globe, Twitter } from "lucide-react";
import { Logo } from "@/components/brand/logo";

const SOCIAL_LINKS = {
  instagram: "https://instagram.com/varunvaatsalya",
  linkedin: "https://linkedin.com/in/varunvaatsalya",
  portfolio: "https://varunvaatsalya.github.io",
};

export default function Footer() {
  return (
    <footer className="w-full relative z-12 bg-[#090b11] border-t border-slate-900/60 text-slate-400 py-16 font-sans select-none">
      <div className="mx-auto w-full max-w-5xl px-6">
        
        {/* Top Section Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8 pb-12 border-b border-slate-900/40">
          
          {/* Logo & Description Column */}
          <div className="md:col-span-5 flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2">
              <Logo className="h-6 w-6 text-primary" />
              <span className="text-md font-black tracking-tight text-white">nSplit</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-[280px]">
              The simplest way to split expenses and track balances with friends, family, and roommates.
            </p>
            {/* Social Icons list */}
            <div className="flex items-center gap-3 mt-2 text-slate-450">
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors p-1"
                aria-label="Instagram"
              >
                <Instagram className="h-4.5 w-4.5" />
              </a>
              <a
                href={SOCIAL_LINKS.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors p-1"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-4.5 w-4.5" />
              </a>
              <a
                href={SOCIAL_LINKS.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors p-1"
                aria-label="Portfolio"
              >
                <Globe className="h-4.5 w-4.5" />
              </a>
            </div>
          </div>

          {/* Product links */}
          <div className="col-span-2 flex flex-col gap-3 text-left">
            <h5 className="text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">Product</h5>
            <Link href="#features" className="text-xs text-slate-450 hover:text-white transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-xs text-slate-450 hover:text-white transition-colors">
              How it Works
            </Link>
            <Link href="#use-cases" className="text-xs text-slate-450 hover:text-white transition-colors">
              Use Cases
            </Link>
            <Link href="#faq" className="text-xs text-slate-450 hover:text-white transition-colors">
              FAQ
            </Link>
          </div>

          {/* Account links */}
          <div className="col-span-2 flex flex-col gap-3 text-left">
            <h5 className="text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">Account</h5>
            <Link href="/login" className="text-xs text-slate-450 hover:text-white transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="text-xs text-slate-450 hover:text-white transition-colors">
              Get Started
            </Link>
            <span className="text-xs text-slate-500 cursor-not-allowed">
              Download App
            </span>
          </div>

          {/* Legal links */}
          <div className="col-span-3 flex flex-col gap-3 text-left">
            <h5 className="text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1">Legal</h5>
            <span className="text-xs text-slate-500 cursor-not-allowed">
              Privacy Policy
            </span>
            <span className="text-xs text-slate-500 cursor-not-allowed">
              Terms of Service
            </span>
            <span className="text-xs text-slate-500 cursor-not-allowed">
              Cookie Policy
            </span>
          </div>

        </div>

        {/* Bottom copyright row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 text-[11px] text-slate-500">
          <span>&copy; {new Date().getFullYear()} nSplit Inc. All rights reserved.</span>
          <span className="flex items-center gap-1">
            Designed with <span className="text-emerald-500">💚</span> for peace of mind.
          </span>
        </div>

      </div>
    </footer>
  );
}
