import {
    parseLocationDecimal,
    parseLocationMoney,
    type FranchiseLocationDataEnvelope,
    type SiteConditionItem
} from './franchise-location-master';

export type FranchisePropertyIntakeDetails = {
    readonly detailAddress: string;
    readonly floor: string;
    readonly totalFloors: string;
    readonly currentStatus: string;
    readonly vatIncluded: string;
    readonly leaseAvailableDate: string;
    readonly contractPeriod: string;
    readonly negotiable: string;
    readonly rentFreeAvailable: string;
    readonly rentFreePeriod: string;
    readonly interiorSupportAvailable: string;
    readonly simpleInstallSupportAvailable: string;
    readonly facilityWorkNegotiable: string;
    readonly landlordSupportMemo: string;
    readonly consultationMemo: string;
    readonly riskMemo: string;
    readonly nextAction: string;
    readonly nextContactAt: string;
};

function cleanString(value: unknown): string {
    if (value === null || value === undefined) return '';
    return String(value).trim();
}

function readDataString(data: Record<string, unknown>, keys: readonly string[]): string {
    for (const key of keys) {
        const value = cleanString(data[key]);
        if (value) return value;
    }
    return '';
}

function readLocationMoney(data: Record<string, unknown>, keys: readonly string[]): number | null {
    for (const key of keys) {
        const parsed = parseLocationMoney(data[key]);
        if (parsed !== null) return parsed;
    }
    return null;
}

function readLocationDecimal(data: Record<string, unknown>, keys: readonly string[]): number | null {
    for (const key of keys) {
        const parsed = parseLocationDecimal(data[key]);
        if (parsed !== null) return parsed;
    }
    return null;
}

function buildAreaPyeong(data: Record<string, unknown>): number | null {
    const explicitPyeong = readLocationDecimal(data, ['privateAreaPyeong', 'exclusiveAreaPyeong']);
    if (explicitPyeong !== null) return explicitPyeong;

    const unit = readDataString(data, ['privateAreaUnit']);
    if (unit === 'pyeong') {
        const inputPyeong = readLocationDecimal(data, ['privateAreaInput', 'privateArea']);
        if (inputPyeong !== null) return inputPyeong;
    }

    return readLocationDecimal(data, ['privateArea', 'area']);
}

function appendFloorSuffix(value: string): string {
    if (!value) return '';
    return value.endsWith('층') ? value : `${value}층`;
}

function formatParkingAreaMemo(data: Record<string, unknown>): string {
    const raw = readDataString(data, ['parkingAvailable', 'parking']);
    if (!raw) return '';
    if (raw.includes('불가') || raw.includes('없음') || raw === 'N') return '주차 불가';
    if (raw.includes('가능') || raw.includes('있음') || raw === 'Y') return '주차 가능';
    return raw.startsWith('주차') ? raw : `주차 ${raw}`;
}

function buildExclusiveAreaMemo(data: Record<string, unknown>): string {
    const squareMeter = readDataString(data, ['privateAreaSquareMeter']);
    const pyeong = readDataString(data, ['privateAreaPyeong']) || (buildAreaPyeong(data)?.toLocaleString() || '');
    const floor = readDataString(data, ['floor', 'currentFloor']);
    const totalFloors = readDataString(data, ['totalFloors', 'totalFloor']);
    const currentStatus = readDataString(data, ['currentStatus']);
    const parkingMemo = formatParkingAreaMemo(data);
    const parts = [
        squareMeter ? `전용 ${squareMeter}㎡` : pyeong ? `전용 ${pyeong}평` : '',
        appendFloorSuffix(floor),
        totalFloors ? `전체 ${appendFloorSuffix(totalFloors)}` : '',
        currentStatus ? `현상태 ${currentStatus}` : '',
        parkingMemo
    ].filter(Boolean);

    return parts.join(' / ');
}

function buildParkingCondition(data: Record<string, unknown>): SiteConditionItem {
    const raw = readDataString(data, ['parkingAvailable', 'parking']);
    if (!raw) return { value: '미확인', memo: '' };
    if (raw.includes('불가') || raw.includes('없음') || raw === 'N') return { value: '없음', memo: raw };
    if (raw.includes('가능') || raw.includes('있음') || raw === 'Y') return { value: '있음', memo: raw };
    return { value: '미확인', memo: raw };
}

function joinMemoParts(parts: readonly string[]): string {
    return parts.filter(Boolean).join(' / ');
}

export function buildPropertyIntakeDetails(data: Record<string, unknown>): FranchisePropertyIntakeDetails {
    return {
        detailAddress: readDataString(data, ['detailAddress']),
        floor: readDataString(data, ['floor', 'currentFloor']),
        totalFloors: readDataString(data, ['totalFloors', 'totalFloor']),
        currentStatus: readDataString(data, ['currentStatus']),
        vatIncluded: readDataString(data, ['vatIncluded']),
        leaseAvailableDate: readDataString(data, ['leaseAvailableDate']),
        contractPeriod: readDataString(data, ['contractPeriod']),
        negotiable: readDataString(data, ['negotiable']),
        rentFreeAvailable: readDataString(data, ['rentFreeAvailable']),
        rentFreePeriod: readDataString(data, ['rentFreePeriod']),
        interiorSupportAvailable: readDataString(data, ['interiorSupportAvailable']),
        simpleInstallSupportAvailable: readDataString(data, ['simpleInstallSupportAvailable']),
        facilityWorkNegotiable: readDataString(data, ['facilityWorkNegotiable']),
        landlordSupportMemo: readDataString(data, ['landlordSupportMemo']),
        consultationMemo: readDataString(data, ['consultationMemo']),
        riskMemo: readDataString(data, ['riskMemo']),
        nextAction: readDataString(data, ['nextAction']),
        nextContactAt: readDataString(data, ['nextContactAt'])
    };
}

export function buildLocationMasterData(data: Record<string, unknown>): FranchiseLocationDataEnvelope {
    const intakeDetails = buildPropertyIntakeDetails(data);
    return {
        developmentStage: '개발중',
        importance: '보통',
        fileNames: [],
        fileAttachments: [],
        siteCondition: {
            exclusiveAreaPyeong: buildAreaPyeong(data),
            exclusiveAreaMemo: buildExclusiveAreaMemo(data),
            restroom: { value: '미확인', memo: '' },
            elevator: { value: '미확인', memo: '' },
            demolition: { value: '미확인', memo: '' },
            parking: buildParkingCondition(data)
        },
        landlord: {
            name: '',
            phone: '',
            tendency: intakeDetails.landlordSupportMemo
        },
        cost: {
            deposit: readLocationMoney(data, ['deposit']),
            premium: readLocationMoney(data, ['premium']),
            memo: intakeDetails.riskMemo
        },
        lease: {
            monthlyRent: readLocationMoney(data, ['monthlyRent']),
            maintenanceFee: readLocationMoney(data, ['maintenanceFee', 'maintenance']),
            memo: joinMemoParts([
                intakeDetails.vatIncluded ? `부가세 ${intakeDetails.vatIncluded}` : '',
                intakeDetails.leaseAvailableDate ? `임대 가능일 ${intakeDetails.leaseAvailableDate}` : '',
                intakeDetails.contractPeriod ? `계약 기간 ${intakeDetails.contractPeriod}` : '',
                intakeDetails.negotiable ? `협의 ${intakeDetails.negotiable}` : '',
                intakeDetails.rentFreeAvailable ? `렌트프리 ${intakeDetails.rentFreeAvailable}` : '',
                intakeDetails.rentFreePeriod ? `렌트프리 기간 ${intakeDetails.rentFreePeriod}` : '',
                intakeDetails.interiorSupportAvailable ? `인테리어 지원 ${intakeDetails.interiorSupportAvailable}` : '',
                intakeDetails.simpleInstallSupportAvailable ? `간판 설치 지원 ${intakeDetails.simpleInstallSupportAvailable}` : '',
                intakeDetails.facilityWorkNegotiable ? `시설 공사 협의 ${intakeDetails.facilityWorkNegotiable}` : '',
                intakeDetails.landlordSupportMemo ? `기타 지원 ${intakeDetails.landlordSupportMemo}` : ''
            ])
        }
    };
}
