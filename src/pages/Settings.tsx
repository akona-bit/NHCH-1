import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { User, Settings as SettingsIcon, Shield, BadgeCheck, Save, X } from 'lucide-react';
import { cn } from '../lib/utils';

export const Settings = () => {
  const { language } = useSettings();
  const [activeTab, setActiveTab] = useState('account');

  return (
    <div className="max-w-6xl mx-auto space-y-8 h-full flex flex-col">
      <div>
          <h1 className="text-3xl font-display font-bold text-on-surface">System Parameters</h1>
          <p className="text-on-surface-variant mt-2 text-sm">Configure platform defaults and security protocols.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Left Sidebar Tabs */}
          <div className="w-full md:w-64 flex flex-col gap-1">
            <button
              onClick={() => setActiveTab('account')}
              className={cn(
                "w-full px-5 py-3 text-sm font-semibold transition-all duration-200 text-left border-l-2",
                activeTab === 'account'
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:bg-surface-bright hover:text-on-surface"
              )}
            >
              Account & Profile
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={cn(
                "w-full px-5 py-3 text-sm font-semibold transition-all duration-200 text-left border-l-2",
                activeTab === 'preferences'
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:bg-surface-bright hover:text-on-surface"
              )}
            >
              System Preferences
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={cn(
                "w-full px-5 py-3 text-sm font-semibold transition-all duration-200 text-left border-l-2",
                activeTab === 'security'
                  ? "bg-primary/10 border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:bg-surface-bright hover:text-on-surface"
              )}
            >
              Security & Access
            </button>
          </div>

          {/* Right Content Area */}
          <div className="flex-1">
            {activeTab === 'account' && (
              <div className="bg-surface border border-outline-variant rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-outline-variant flex items-center gap-3">
                  <BadgeCheck className="w-5 h-5 text-on-surface-variant" />
                  <h2 className="text-lg font-semibold text-on-surface">Identity Configuration</h2>
                </div>
                
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row gap-8">
                    {/* Avatar */}
                    <div className="shrink-0">
                      <div className="w-32 h-32 rounded-lg overflow-hidden border border-outline-variant bg-surface-dim">
                        <img 
                          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=256" 
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    
                    {/* Form Fields */}
                    <div className="flex-1 space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                            Full Name
                          </label>
                          <input 
                            type="text" 
                            defaultValue="Dr. Aris Thorne"
                            className="w-full bg-background border border-outline-variant rounded px-4 py-2 text-sm text-on-surface focus:border-primary outline-none transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                            Clearance Level
                          </label>
                          <input 
                            type="text" 
                            defaultValue="System Administrator"
                            readOnly
                            className="w-full bg-surface-dim/50 border border-outline-variant rounded px-4 py-2 text-sm text-outline focus:outline-none cursor-not-allowed"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                          Institutional Email
                        </label>
                        <input 
                          type="email" 
                          defaultValue="a.thorne@archexam.edu"
                          className="w-full bg-background border border-outline-variant rounded px-4 py-2 text-sm text-on-surface focus:border-primary outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-outline-variant flex justify-end gap-4">
                    <button className="px-5 py-2.5 border border-outline-variant text-on-surface hover:bg-surface-bright rounded-lg text-sm font-medium transition-colors">
                      Discard Changes
                    </button>
                    <button className="px-5 py-2.5 bg-primary text-on-primary hover:bg-primary/90 rounded-lg text-sm font-medium transition-colors">
                      Commit Update
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="bg-surface border border-outline-variant rounded-xl p-8 flex items-center justify-center text-on-surface-variant">
                System Preferences Content Placeholder
              </div>
            )}

            {activeTab === 'security' && (
              <div className="bg-surface border border-outline-variant rounded-xl p-8 flex items-center justify-center text-on-surface-variant">
                Security & Access Content Placeholder
              </div>
            )}
          </div>
        </div>
    </div>
  );
};
