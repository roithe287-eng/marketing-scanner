import type {MetadataRoute} from 'next';
import {AI_ROBOTS_POLICY_TOKENS} from '../lib/security/aiCollection';

export default function robots(): MetadataRoute.Robots {
  return {
    rules:[
      {
        userAgent:'*',
        allow:'/',
        disallow:['/api/', '/r/', '/account', '/manage', '/setup', '/activate', '/login', '/review/'],
      },
      {userAgent:AI_ROBOTS_POLICY_TOKENS, disallow:'/'},
    ],
  };
}
