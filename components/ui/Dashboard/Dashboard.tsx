'use client';

import Button from '@/components/ui/Button';
import LogoCloud from '@/components/ui/LogoCloud';
import type { Tables } from '@/types_db';
import { getStripe } from '@/utils/stripe/client';
import { checkoutWithStripe } from '@/utils/stripe/server';
import { getErrorRedirect } from '@/utils/helpers';
import { User } from '@supabase/supabase-js';
import cn from 'classnames';
import { useRouter, usePathname } from 'next/navigation';
import { useState } from 'react';

export default function ({ user, userName, subscription }: any) {
    return (
      <>
        {user && subscription ? (
          <section className="mb-32 bg-black">
            <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
              <div className="sm:align-center sm:flex sm:flex-col">
                <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
                  Welcome Back, {userName}
                </h1>
                <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-2xl">
                  Thanks for being a {subscription?.prices?.products?.name}!
                </p>
              </div>
            </div>
          </section>
        ) : user ? (
          <section className="mb-32 bg-black">
            <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
              <div className="sm:align-center sm:flex sm:flex-col">
                <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-6xl">
                  Welcome, {userName}
                </h1>
                <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-2xl">
                  As a courtesy, we've provided a delayed demo with the essentials for the latest trading window.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="mb-32 bg-black">
            <div className="max-w-6xl px-4 py-8 mx-auto sm:px-6 sm:pt-24 lg:px-8">
              <div className="sm:align-center sm:flex sm:flex-col">
                <h1 className="text-4xl font-extrabold text-white sm:text-center sm:text-5xl">
                  Never Miss Another Wall Street Moment
                </h1>
                <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-xl">
                  Experience the financial tool that empowers our partners to manage over <br></br>
                  <span className="text-pink-600 sm:text-3xl">$1.3 million</span>
                </p>



                <br></br> 
                <a className='text-center sm:text-6xl'> PUT THE CHART HERE TODO LATER :3 </a>
                <br></br>



                <p className="max-w-2xl m-auto mt-5 text-xl text-zinc-200 sm:text-center sm:text-xl">
                  You'll never miss another <span className="text-pink-600">Wall Street Moment</span> with our AI flagship model, (CNN-LSTM with GPT) sentiment - momentum forecaster: <br></br> <span className="text-pink-600">Wall Street Momentum</span>
                </p>
              </div>
            </div>
          </section>
        )}
        <LogoCloud />
        <div>
        <br></br>
        <br></br>
        </div>
      </>
    );
  }
  