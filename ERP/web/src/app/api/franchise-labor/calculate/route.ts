import { fail, ok } from '@/lib/api-response';
import {
    getLaborBodyValue,
    numberFromBody,
    readLaborJsonBody,
    resolveLaborAuth,
    settingsFromBody,
    weekdaysFromBody
} from '@/lib/franchise-labor-api';
import { calculateLaborPlan } from '@/lib/franchise-labor-planning';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const authResult = await resolveLaborAuth(request);
        if (!authResult.ok) return authResult.response;
        const body = await readLaborJsonBody(request);
        const settings = settingsFromBody(getLaborBodyValue(body, ['settings']));

        const result = calculateLaborPlan({
            monthlySalesTarget: numberFromBody(getLaborBodyValue(body, ['monthlySalesTarget', 'monthly_sales_target']), 30_000_000),
            targetLaborRatio: numberFromBody(getLaborBodyValue(body, ['targetLaborRatio', 'target_labor_ratio']), 20),
            operatingWeekdays: weekdaysFromBody(getLaborBodyValue(body, ['operatingWeekdays', 'operating_weekdays'])),
            openTime: String(getLaborBodyValue(body, ['openTime', 'open_time']) || '10:00'),
            closeTime: String(getLaborBodyValue(body, ['closeTime', 'close_time']) || '22:00'),
            ownerWorks: getLaborBodyValue(body, ['ownerWorks', 'owner_works']) === true,
            useBreakTime: getLaborBodyValue(body, ['useBreakTime', 'use_break_time']) !== false,
            breakStartTime: String(getLaborBodyValue(body, ['breakStartTime', 'break_start_time']) || '15:00'),
            breakEndTime: String(getLaborBodyValue(body, ['breakEndTime', 'break_end_time']) || '17:00'),
            managerMonthlySalary: numberFromBody(getLaborBodyValue(body, ['managerMonthlySalary', 'manager_monthly_salary']), 3_000_000),
            staffMonthlySalary: numberFromBody(getLaborBodyValue(body, ['staffMonthlySalary', 'staff_monthly_salary']), 2_600_000),
            partTimeHourlyWage: numberFromBody(getLaborBodyValue(body, ['partTimeHourlyWage', 'part_time_hourly_wage']), settings.minimumHourlyWage),
            settings
        });

        return ok({ result });
    } catch (error) {
        console.error('Franchise labor calculate error:', error);
        return fail(500, 'INTERNAL_ERROR', '인력 세팅 계산에 실패했습니다.');
    }
}
