"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import {requestJson} from '@/lib/client/request';
import {z} from 'zod';
import type { Account } from "@/lib/saas/types";
export type AccessState = {
  kind: "loading" | "guest" | "internal" | "account" | "error";
  admin?: boolean;
  account?: Omit<Account, "passwordHash">;
  usage?: Record<string, number>;
  reports?: { id: string; url: string; title: string }[];
  message?: string;
};
const AccountSchema=z.object({
  id:z.string(),email:z.string(),name:z.string(),company:z.string(),
  role:z.enum(['admin','customer']),status:z.enum(['approved','suspended']),
  expiresAt:z.number(),monthlyLimit:z.number(),version:z.number(),createdAt:z.number(),
  features:z.object({competitor:z.boolean(),deepdive:z.boolean(),reports:z.boolean()}),
});
const AccessSchema=z.object({
  kind:z.enum(['guest','internal','account']),admin:z.boolean().optional(),account:AccountSchema.optional(),
  usage:z.record(z.number()).optional(),reports:z.array(z.object({id:z.string(),url:z.string(),title:z.string()})).optional(),
}).refine(value=>value.kind!=='account'||!!value.account);
export function useAccess(withReports = false) {
  const [access,setAccess]=useState<AccessState>({kind:'loading'});
  const active=useRef<AbortController|null>(null);
  const refresh=useCallback(async()=>{
    active.current?.abort();
    const controller=new AbortController();active.current=controller;
    try{
      const data=await requestJson('/api/access'+(withReports?'?reports=1':''),{cache:'no-store',signal:controller.signal},15000);
      const parsed=AccessSchema.safeParse(data);
      if(!parsed.success)throw new Error('Invalid access response');
      if(!controller.signal.aborted)setAccess(parsed.data);
    }catch{
      if(!controller.signal.aborted)setAccess({kind:'error',message:'접근 권한을 확인하지 못했습니다. 새로고침해 주세요.'});
    }
  },[withReports]);
  useEffect(()=>{
    void refresh();
    const update=()=>void refresh();
    window.addEventListener('focus',update);window.addEventListener('scanner-usage',update);
    return()=>{
      active.current?.abort();
      window.removeEventListener('focus',update);window.removeEventListener('scanner-usage',update);
    };
  },[refresh]);
  return {access,refresh};
}
