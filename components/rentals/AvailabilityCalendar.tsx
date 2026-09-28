import React, { useState, useMemo } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  differenceInDays,
  addDays,
  isBefore,
  isAfter
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarDays,
  Clock,
  User,
  Package,
  AlertCircle,
  Filter,
  ArrowRight,
  Plus,
  X,
  Phone,
  IndianRupee,
  CheckCircle2,
  CalendarCheck,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { Rental, RentalStatus, Product } from '../../types';
import { formatCurrency } from '../../utils/helpers';

interface AvailabilityCalendarProps {
  onBookReservation: (productId?: string, startDate?: string, returnDate?: string) => void;
  onViewRentalDetails?: (rental: Rental) => void;
}

export const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
  onBookReservation,
  onViewRentalDetails
}) => {
  const { rentals, products, customers } = useApp();

  // Calendar navigation state
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedProductId, setSelectedProductId] = useState<string>('ALL');

  // Quick Availability Checker form state
  const [checkerProductId, setCheckerProductId] = useState<string>('');
  const [checkerStartDate, setCheckerStartDate] = useState<string>(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [checkerReturnDate, setCheckerReturnDate] = useState<string>(format(addDays(new Date(), 4), 'yyyy-MM-dd'));

  // Month navigation handlers
  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));
  const goToToday = () => {
    const now = new Date();
    setCurrentMonth(now);
    setSelectedDate(now);
  };

  // Only consider active leases and advance reservations for calendar availability
  const relevantRentals = useMemo(() => {
    return rentals.filter(r => r.status === RentalStatus.ACTIVE || r.status === RentalStatus.RESERVED);
  }, [rentals]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentMonth]);

  // Helper: check if a rental spans a specific calendar day
  const isRentalOnDay = (rental: Rental, day: Date) => {
    try {
      const start = parseISO(rental.startDate.split('T')[0]);
      const end = parseISO(rental.expectedReturnDate.split('T')[0]);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      const checkTime = day.getTime();
      return checkTime >= start.getTime() && checkTime <= end.getTime();
    } catch {
      return false;
    }
  };

  // Bookings for the currently selected day
  const selectedDayBookings = useMemo(() => {
    return relevantRentals.filter(r => {
      if (selectedProductId !== 'ALL' && r.productId !== selectedProductId) return false;
      return isRentalOnDay(r, selectedDate);
    });
  }, [relevantRentals, selectedDate, selectedProductId]);

  // Quick Availability Checker Calculation
  const availabilityResult = useMemo(() => {
    if (!checkerProductId || !checkerStartDate || !checkerReturnDate) {
      return null;
    }

    const prod = products.find(p => p.id === checkerProductId);
    if (!prod) return null;

    try {
      const checkStart = parseISO(checkerStartDate);
      const checkEnd = parseISO(checkerReturnDate);
      checkStart.setHours(0, 0, 0, 0);
      checkEnd.setHours(23, 59, 59, 999);

      if (isAfter(checkStart, checkEnd)) {
        return { error: 'Pick-up date cannot be after return date.' };
      }

      const totalRentalStock = prod.rentalStock || 0;

      // Find all overlapping rentals for this product
      const overlappingRentals = relevantRentals.filter(r => {
        if (r.productId !== checkerProductId) return false;
        try {
          const rStart = parseISO(r.startDate.split('T')[0]);
          const rEnd = parseISO(r.expectedReturnDate.split('T')[0]);
          rStart.setHours(0, 0, 0, 0);
          rEnd.setHours(23, 59, 59, 999);

          // Overlap condition: rStart <= checkEnd && rEnd >= checkStart
          return rStart.getTime() <= checkEnd.getTime() && rEnd.getTime() >= checkStart.getTime();
        } catch {
          return false;
        }
      });

      const bookedUnits = overlappingRentals.reduce((sum, r) => sum + (r.quantity || 1), 0);
      const availableUnits = Math.max(0, totalRentalStock);
      const durationDays = Math.max(1, differenceInDays(checkEnd, checkStart));
      const estimatedCost = durationDays * prod.rentalPrice;

      return {
        product: prod,
        totalStock: totalRentalStock,
        overlappingRentals,
        bookedUnits,
        availableUnits,
        durationDays,
        estimatedCost,
        isAvailable: availableUnits > 0
      };
    } catch {
      return null;
    }
  }, [checkerProductId, checkerStartDate, checkerReturnDate, products, relevantRentals]);

  // Monthly statistics
  const monthStats = useMemo(() => {
    const monthStart = startOfMonth(currentMonth).getTime();
    const monthEnd = endOfMonth(currentMonth).getTime();

    let monthReservations = 0;
    let monthActives = 0;

    relevantRentals.forEach(r => {
      try {
        const start = parseISO(r.startDate.split('T')[0]).getTime();
        if (start >= monthStart && start <= monthEnd) {
          if (r.status === RentalStatus.RESERVED) monthReservations++;
          if (r.status === RentalStatus.ACTIVE) monthActives++;
        }
      } catch {}
    });

    return { monthReservations, monthActives };
  }, [currentMonth, relevantRentals]);

  return (
    <div className="space-y-4">
      {/* ── Top Bar: Quick Availability Checker Widget ── */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <CalendarCheck size={18} strokeWidth={2.4} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Advance Availability Checker</h2>
              <p className="text-[11px] text-slate-500 font-medium">Verify garment stock availability for future wedding & party dates</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onBookReservation(checkerProductId || undefined, checkerStartDate, checkerReturnDate)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#fe569f] hover:bg-[#eb4890] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
            >
              <Plus size={14} strokeWidth={3} />
              <span>New / Advance Booking</span>
            </button>
          </div>
        </div>

        {/* Checker Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-3">
          {/* Garment Selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Garment / Outfit *</label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <select
                value={checkerProductId}
                onChange={(e) => setCheckerProductId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#fe569f] focus:bg-white transition-all cursor-pointer truncate"
              >
                <option value="">Select Garment to Check</option>
                {products
                  .filter(p => p.purpose === 'RENTAL' || p.purpose === 'HYBRID')
                  .map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Rent: {formatCurrency(p.rentalPrice)}/d | Stock: {p.rentalStock})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Pick-up / Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Pick-up Date *</label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="date"
                value={checkerStartDate}
                onChange={(e) => setCheckerStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#fe569f] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Return Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Return Date *</label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="date"
                value={checkerReturnDate}
                onChange={(e) => setCheckerReturnDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#fe569f] focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Calculated Output Pill & Quick Action */}
          <div className="sm:col-span-3 lg:col-span-1 flex flex-col justify-end">
            {availabilityResult ? (
              availabilityResult.error ? (
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-bold text-rose-600 flex items-center gap-1.5">
                  <AlertCircle size={14} className="shrink-0" />
                  <span className="truncate">{availabilityResult.error}</span>
                </div>
              ) : availabilityResult.isAvailable ? (
                <button
                  type="button"
                  onClick={() => onBookReservation(checkerProductId, checkerStartDate, checkerReturnDate)}
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-between gap-2 shadow-xs transition-all active:scale-95"
                  title="Reserve this garment for the selected dates"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-200" />
                    <span className="truncate">Available ({availabilityResult.availableUnits} units)</span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md shrink-0">
                    Book Now
                  </span>
                </button>
              ) : (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-extrabold text-amber-800 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1 min-w-0">
                    <AlertCircle size={14} className="shrink-0 text-amber-600" />
                    <span className="truncate">0 Available (Fully Booked)</span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-700 shrink-0">
                    Try other dates
                  </span>
                </div>
              )
            ) : (
              <div className="py-2 px-3 bg-slate-100/80 border border-slate-200/80 rounded-xl text-[11px] font-bold text-slate-500 text-center flex items-center justify-center gap-1.5">
                <Sparkles size={13} className="text-amber-500 shrink-0" />
                <span>Select outfit to check</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Main Calendar Container (Month Grid + Day Sidebar) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left/Center: Calendar Matrix (8 of 12 cols on desktop) */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          {/* Calendar Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight min-w-[160px]">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  onClick={prevMonth}
                  className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
                  title="Previous Month"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} />
                </button>
                <button
                  onClick={goToToday}
                  className="px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700 hover:text-slate-900 hover:bg-white rounded-md transition-all uppercase tracking-wider"
                >
                  Today
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all"
                  title="Next Month"
                >
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Filter by Product */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-56">
                <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-[#fe569f] focus:bg-white transition-all cursor-pointer truncate"
                >
                  <option value="ALL">All Garments (Overview)</option>
                  {products
                    .filter(p => p.purpose === 'RENTAL' || p.purpose === 'HYBRID')
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Status Indicators Legend */}
          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] font-bold text-slate-600 border-b border-slate-100 pb-3">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <span>Advance Reservation</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#fe569f] shrink-0"></span>
              <span>Active Lease</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span>Return Due</span>
            </div>
          </div>

          {/* Calendar Grid Matrix */}
          <div>
            {/* Weekdays Header */}
            <div className="grid grid-cols-7 gap-1 text-center pb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {calendarDays.map((day, idx) => {
                const dayStr = format(day, 'yyyy-MM-dd');
                const isCurrentMonthDay = isSameMonth(day, currentMonth);
                const isSelected = isSameDay(day, selectedDate);
                const isCurrentDay = isToday(day);

                // Bookings on this calendar cell
                const dayBookings = relevantRentals.filter(r => {
                  if (selectedProductId !== 'ALL' && r.productId !== selectedProductId) return false;
                  return isRentalOnDay(r, day);
                });

                const reservationsCount = dayBookings.filter(r => r.status === RentalStatus.RESERVED).length;
                const activeCount = dayBookings.filter(r => r.status === RentalStatus.ACTIVE).length;
                const returnsDueToday = dayBookings.filter(r => {
                  try {
                    return isSameDay(parseISO(r.expectedReturnDate.split('T')[0]), day) && r.status === RentalStatus.ACTIVE;
                  } catch { return false; }
                }).length;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDate(day)}
                    className={`min-h-[72px] sm:min-h-[86px] p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left ${
                      isSelected
                        ? 'border-[#fe569f] ring-2 ring-[#fe569f]/20 bg-pink-50/30'
                        : isCurrentDay
                        ? 'border-blue-400/80 bg-blue-50/20'
                        : isCurrentMonthDay
                        ? 'border-slate-200/70 hover:border-slate-300 hover:bg-slate-50/60 bg-white'
                        : 'border-slate-100 bg-slate-50/40 opacity-40 hover:opacity-80'
                    }`}
                  >
                    {/* Day Number Header */}
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black rounded-md px-1 py-0.2 ${
                        isCurrentDay
                          ? 'bg-blue-600 text-white'
                          : isSelected
                          ? 'text-[#fe569f]'
                          : isCurrentMonthDay
                          ? 'text-slate-800'
                          : 'text-slate-400'
                      }`}>
                        {format(day, 'd')}
                      </span>

                      {dayBookings.length > 0 && (
                        <span className="text-[9px] font-black px-1 rounded bg-slate-100 text-slate-700">
                          {dayBookings.length}
                        </span>
                      )}
                    </div>

                    {/* Bookings Visual Dots / Micro Badges */}
                    <div className="space-y-1 mt-1">
                      {reservationsCount > 0 && (
                        <div className="px-1 py-0.5 rounded bg-amber-100/90 text-amber-800 text-[9px] font-extrabold flex items-center gap-1 truncate" title={`${reservationsCount} Advance Reservations`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
                          <span className="truncate">{reservationsCount} Res.</span>
                        </div>
                      )}

                      {activeCount > 0 && (
                        <div className="px-1 py-0.5 rounded bg-pink-100/90 text-pink-900 text-[9px] font-extrabold flex items-center gap-1 truncate" title={`${activeCount} Active Leases`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#fe569f] shrink-0"></span>
                          <span className="truncate">{activeCount} Rented</span>
                        </div>
                      )}

                      {returnsDueToday > 0 && (
                        <div className="px-1 py-0.5 rounded bg-emerald-100/90 text-emerald-900 text-[9px] font-extrabold flex items-center gap-1 truncate" title={`${returnsDueToday} Returns Due`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                          <span className="truncate">{returnsDueToday} Due</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Selected Day Schedule & Bookings Sidebar (4 of 12 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Day Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Selected Schedule</span>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <CalendarIcon size={14} className="text-[#fe569f]" />
                  <span>{format(selectedDate, 'EEEE, dd MMMM yyyy')}</span>
                </h3>
              </div>

              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                isToday(selectedDate)
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {isToday(selectedDate) ? 'Today' : format(selectedDate, 'MMM d')}
              </span>
            </div>

            {/* Bookings on this Day */}
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {selectedDayBookings.length > 0 ? (
                selectedDayBookings.map(rental => {
                  const cust = customers.find(c => c.id === rental.customerId);
                  const prod = products.find(p => p.id === rental.productId);
                  const isReservation = rental.status === RentalStatus.RESERVED;
                  const isPickupDay = isSameDay(parseISO(rental.startDate.split('T')[0]), selectedDate);
                  const isReturnDay = isSameDay(parseISO(rental.expectedReturnDate.split('T')[0]), selectedDate);

                  return (
                    <div
                      key={rental.id}
                      className={`p-3 rounded-xl border transition-all space-y-2 ${
                        isReservation
                          ? 'bg-amber-50/50 border-amber-200/80'
                          : 'bg-pink-50/30 border-pink-200/80'
                      }`}
                    >
                      {/* Booking Top Info */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md inline-block mb-1 ${
                            isReservation
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-pink-100 text-pink-900'
                          }`}>
                            {isReservation ? '📅 Advance Reservation' : '⚡ Active Lease'}
                          </span>
                          <h4 className="text-xs font-black text-slate-900 truncate">
                            {prod?.name || 'Garment'}
                          </h4>
                        </div>

                        <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">
                          {rental.invoiceNumber}
                        </span>
                      </div>

                      {/* Customer & Dates */}
                      <div className="space-y-1 text-[11px] text-slate-600 font-medium">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 truncate">
                            <User size={12} className="text-slate-400 shrink-0" />
                            <span className="font-bold text-slate-800 truncate">{cust?.name || 'Customer'}</span>
                          </div>
                          {cust?.phone && (
                            <a
                              href={`tel:${cust.phone}`}
                              className="text-[10px] font-bold text-[#fe569f] hover:underline flex items-center gap-0.5 shrink-0"
                            >
                              <Phone size={10} /> {cust.phone}
                            </a>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-1 border-t border-slate-200/60">
                          <span>
                            {rental.startDate.split('T')[0]} → {rental.expectedReturnDate}
                          </span>
                          <span className="font-mono font-black text-slate-900">
                            Rent: {formatCurrency(rental.totalRentAmount)}
                          </span>
                        </div>

                        {/* Special Day Note (Pickup or Return) */}
                        {isPickupDay && (
                          <div className="text-[10px] font-bold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Clock size={10} /> Pick-up scheduled today
                          </div>
                        )}
                        {isReturnDay && (
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <RotateCcw size={10} /> Expected return today
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-10 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <CalendarCheck size={20} />
                  </div>
                  <p className="text-xs font-bold text-slate-600">No bookings on this date</p>
                  <p className="text-[11px] text-slate-400">All garments are available for rental or advance booking</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Booking Button for Selected Date */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => onBookReservation(
                selectedProductId !== 'ALL' ? selectedProductId : undefined,
                format(selectedDate, 'yyyy-MM-dd'),
                format(addDays(selectedDate, 3), 'yyyy-MM-dd')
              )}
              className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
            >
              <Plus size={14} strokeWidth={3} />
              <span>Reserve for {format(selectedDate, 'MMM d')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
