import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, RefreshCw, XCircle, Terminal, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../supabaseClient';

type Severity = 'CRITICAL' | 'WARNING' | 'INFO' | 'SUCCESS';

interface StreamEvent {
  id: string;
  type: Severity;
  title: string;
  timestamp: string;
  description: string;
  actionRequired?: boolean;
  actions?: string[];
  metrics?: { label: string; value: string; isError?: boolean }[];
  telemetry?: string[];
}

export const SystemAlerts = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<StreamEvent | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn("Error fetching system alerts.", error);
        setEvents([]);
        setSelectedEvent(null);
      } else if (data && data.length > 0) {
        // Map data if necessary or just use it directly
        const mappedData = data.map(item => ({
          id: item.alert_id || item.id,
          type: item.type as Severity,
          title: item.title,
          timestamp: item.timestamp || new Date(item.created_at).toLocaleTimeString(),
          description: item.description,
          actionRequired: item.action_required,
          actions: item.actions || [],
          metrics: item.metrics || [],
          telemetry: item.telemetry || [],
        }));
        setEvents(mappedData);
        setSelectedEvent(mappedData[0]);
      } else {
        setEvents([]);
        setSelectedEvent(null);
      }
    } catch (err) {
      console.error("Error fetching alerts:", err);
      setEvents([]);
      setSelectedEvent(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();

    const channel = supabase
      .channel('system_alerts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_alerts' },
        (payload) => {
          console.log('Change received!', payload);
          fetchAlerts(); // Refresh the list when changes happen
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredEvents = events.filter(event => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'critical') return event.type === 'CRITICAL';
    if (activeFilter === 'warnings') return event.type === 'WARNING';
    if (activeFilter === 'info') return event.type === 'INFO' || event.type === 'SUCCESS';
    // 'workflow' can just be another filter condition, for now mapping to anything not critical/warning
    if (activeFilter === 'workflow') return event.type === 'INFO';
    return true;
  });

  const filters = [
    { id: 'all', label: 'All Events', count: events.length },
    { id: 'critical', label: 'Critical', count: events.filter(e => e.type === 'CRITICAL').length },
    { id: 'warnings', label: 'Warnings', count: events.filter(e => e.type === 'WARNING').length },
    { id: 'info', label: 'Information', count: events.filter(e => e.type === 'INFO' || e.type === 'SUCCESS').length },
    { id: 'workflow', label: 'Workflow', count: events.filter(e => e.type === 'INFO').length },
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-8 -my-8 text-on-surface">
      {/* Left Filters */}
      <div className="w-64 border-r border-outline-variant/50 bg-background flex flex-col pt-6">
        <h2 className="px-6 text-xl font-mono font-bold text-primary tracking-wider mb-6">NEURAL_COMMAND</h2>
        <h3 className="px-6 text-[10px] font-bold text-outline uppercase tracking-widest mb-4">Filters</h3>
        <nav className="flex-1 px-4 space-y-1">
          {filters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                activeFilter === filter.id 
                  ? "bg-primary/10 text-primary" 
                  : "text-on-surface-variant hover:bg-surface shadow-sm hover:text-on-surface"
              )}
            >
              {filter.label}
              <span className={cn(
                "px-2 py-0.5 rounded text-xs font-mono",
                activeFilter === filter.id ? "bg-primary/20 text-primary" : "bg-surface shadow-sm-high text-outline"
              )}>
                {filter.count}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Middle Stream */}
      <div className="flex-1 border-r border-outline-variant/50 bg-background flex flex-col">
        <div className="px-6 py-4 border-b border-outline-variant/50 flex justify-between items-center bg-surface/50 backdrop-blur">
          <h2 className="text-xl font-display font-semibold">Command Stream</h2>
          <button onClick={fetchAlerts} className="text-outline hover:text-on-surface transition-colors" title="Refresh Stream">
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-full text-outline-variant">
              Loading stream...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex items-center justify-center h-full text-outline-variant">
              No events found.
            </div>
          ) : filteredEvents.map(event => {
            const isSelected = selectedEvent?.id === event.id;
            const isCritical = event.type === 'CRITICAL';
            const isWarning = event.type === 'WARNING';
            const isSuccess = event.type === 'SUCCESS';
            const isInfo = event.type === 'INFO';

            return (
              <div 
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
                  isSelected ? "bg-surface shadow-sm shadow-lg" : "bg-background hover:bg-surface shadow-sm/50",
                  isCritical ? "border-error/50" : 
                  isWarning ? "border-secondary/50" : 
                  isSuccess ? "border-tertiary/50" : "border-outline-variant/50"
                )}
              >
                {/* Left Accent Line */}
                <div className={cn(
                  "absolute left-0 top-0 bottom-0 w-1",
                  isCritical ? "bg-error" : 
                  isWarning ? "bg-secondary" : 
                  isSuccess ? "bg-tertiary" : "bg-outline"
                )} />

                <div className="flex gap-4">
                  <div className="mt-1">
                    {isCritical && <AlertCircle className="w-5 h-5 text-error" />}
                    {isWarning && <AlertTriangle className="w-5 h-5 text-secondary" />}
                    {isSuccess && <CheckCircle2 className="w-5 h-5 text-tertiary" />}
                    {isInfo && <Info className="w-5 h-5 text-outline" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={cn(
                        "font-bold text-sm uppercase tracking-wide",
                        isCritical ? "text-error" : 
                        isWarning ? "text-on-surface" : 
                        isSuccess ? "text-tertiary" : "text-on-surface-variant"
                      )}>
                        {event.type === 'INFO' ? (event.title.includes('Request') ? 'USER REQUEST' : 'SYSTEM UPDATE') : 
                         event.type === 'SUCCESS' ? 'PROCESS COMPLETE' : 
                         event.type === 'WARNING' ? 'SYSTEM WARNING' : 'CRITICAL ERROR'}
                      </h3>
                      <span className="text-[10px] font-mono text-outline uppercase tracking-widest whitespace-nowrap ml-4">
                        SYS_TIME: {event.timestamp}
                      </span>
                    </div>
                    
                    <h4 className="text-base font-semibold text-on-surface mb-2 truncate">{event.title}</h4>
                    <p className="text-sm text-on-surface-variant leading-relaxed line-clamp-2 mb-3">
                      {event.description}
                    </p>

                    {event.actions && (
                      <div className="flex gap-2 mt-3">
                        {event.actions.map(action => (
                          <button 
                            key={action}
                            className="px-3 py-1.5 border border-outline-variant hover:border-outline text-xs rounded bg-background text-on-surface hover:bg-surface shadow-sm transition-colors"
                            onClick={(e) => { e.stopPropagation(); }}
                          >
                            [{action}]
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Details */}
      {selectedEvent ? (
        <div className="w-96 bg-background border-l border-outline-variant/50 flex flex-col">
          <div className="p-6 border-b border-outline-variant/50 flex items-start gap-4">
            <div className="mt-1">
              {selectedEvent.type === 'CRITICAL' && <AlertCircle className="w-6 h-6 text-error" />}
              {selectedEvent.type === 'WARNING' && <AlertTriangle className="w-6 h-6 text-secondary" />}
              {selectedEvent.type === 'SUCCESS' && <CheckCircle2 className="w-6 h-6 text-tertiary" />}
              {selectedEvent.type === 'INFO' && <Info className="w-6 h-6 text-outline" />}
            </div>
            <div>
              <h2 className={cn(
                "text-xl font-display font-semibold",
                selectedEvent.type === 'CRITICAL' && "text-error"
              )}>
                {selectedEvent.type === 'CRITICAL' ? 'Critical Error' : 
                 selectedEvent.type === 'WARNING' ? 'System Warning' : 
                 selectedEvent.type === 'SUCCESS' ? 'Process Complete' : selectedEvent.title}
              </h2>
              <p className="text-xs font-mono text-outline-variant mt-1 tracking-widest">ID: {selectedEvent.id}</p>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6 space-y-8">
            <section>
              <h3 className="text-xs font-bold text-outline uppercase tracking-widest mb-3">Event Description</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed font-mono">
                {selectedEvent.description}
              </p>
            </section>

            {selectedEvent.metrics && (
              <div className="grid grid-cols-2 gap-4">
                {selectedEvent.metrics.map(metric => (
                  <div key={metric.label} className="bg-surface shadow-sm rounded-lg p-3 border border-outline-variant/50">
                    <p className="text-[10px] text-outline font-mono mb-1">{metric.label}</p>
                    <p className={cn(
                      "text-sm font-semibold font-mono",
                      metric.isError ? "text-error" : "text-on-surface"
                    )}>
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {selectedEvent.telemetry && (
              <section>
                <h3 className="text-xs font-bold text-outline uppercase tracking-widest mb-3">Raw Telemetry</h3>
                <div className="bg-surface shadow-sm rounded-lg p-4 border border-outline-variant/50 font-mono text-[10px] leading-relaxed overflow-x-auto whitespace-pre">
                  {selectedEvent.telemetry.map((line, i) => (
                    <div key={i} className={cn(
                      "mb-1",
                      line.includes('ERR') || line.includes('CRIT') ? "text-error font-bold" :
                      line.includes('WARN') ? "text-secondary" :
                      "text-tertiary"
                    )}>
                      {line}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {selectedEvent.type === 'CRITICAL' && (
            <div className="p-6 border-t border-outline-variant/50 space-y-3 bg-surface shadow-sm-high">
              <button className="w-full py-3 bg-error/20 hover:bg-error/30 text-error font-semibold text-sm rounded border border-error/50 transition-colors uppercase tracking-wide">
                Initiate Recalibration
              </button>
              <button className="w-full py-3 bg-surface hover:bg-surface shadow-sm border border-outline-variant text-on-surface font-semibold text-sm rounded transition-colors uppercase tracking-wide">
                Quarantine Node
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-96 bg-background border-l border-outline-variant/50 flex items-center justify-center text-outline-variant">
          Select an event to view details
        </div>
      )}
    </div>
  );
};
