import { AlertTriangle, ArrowLeft, Bot, CheckCircle2, Clock3, MapPin, RefreshCw, Sparkles, Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, Popup } from 'react-leaflet';
import { Link, useNavigate, useParams } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import HistoryTimeline, { type HistoryLog } from '../components/HistoryTimeline';
import ImageGallery from '../components/ImageGallery';
import InfoCard, { type InfoRow } from '../components/InfoCard';
import ProcessingPanel from '../components/ProcessingPanel';
import { adminApi, type AdminIncident, type AdminIncidentHistory, type AdminIncidentNote, type AssignableAdmin } from '../services/api';
import MapLayers from '../components/MapLayers';
import { useAuth } from '../context/AuthContext';
import { formatVietnamDateTime, parseDatabaseDateTime } from '../utils/dateTime';
import { useLanguage } from '../context/LanguageContext';

const TileLayer = MapLayers;

const statusLabels: Record<AdminIncident['status'], string> = { pending: 'Mới', assigned: 'Đã tiếp nhận', in_progress: 'Đang xử lý', completed: 'Hoàn tất', rejected: 'Từ chối' };
const priorityLabels: Record<AdminIncident['priority'], string> = { low: 'Thấp', medium: 'Trung bình', high: 'Cao', critical: 'Khẩn cấp' };
const statusToApi: Record<string, string> = { Mới: 'pending', 'Đã tiếp nhận': 'assigned', 'Đang xử lý': 'in_progress', 'Hoàn tất': 'completed', 'Từ chối': 'rejected' };
const priorityToApi: Record<string, AdminIncident['priority']> = { Thấp: 'low', 'Trung bình': 'medium', Cao: 'high', 'Khẩn cấp': 'critical' };
const badgeClass = (value: string) => value === 'Hoàn tất' || value === 'Thấp' ? 'bg-green-50 text-success' : value === 'Khẩn cấp' || value === 'Từ chối' ? 'bg-red-50 text-danger' : value === 'Đang xử lý' || value === 'Cao' ? 'bg-orange-50 text-warning' : 'bg-blue-50 text-info';
const displayStatus = (value: string | null) => value ? statusLabels[value as keyof typeof statusLabels] || value : 'Chưa xác định';
const staffOptionLabel = (person: AssignableAdmin) => person.full_name ? `${person.full_name} (${person.username})` : person.username;
const slaHours: Record<AdminIncident['priority'], number> = { critical: 24, high: 48, medium: 72, low: 120 };

function formatDuration(milliseconds: number, language: 'vi' | 'en') {
    const totalMinutes = Math.floor(Math.abs(milliseconds) / 60_000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;
    return days
        ? `${days} ${language === 'vi' ? 'ngày' : 'days'} ${hours} ${language === 'vi' ? 'giờ' : 'hours'}`
        : `${hours} ${language === 'vi' ? 'giờ' : 'hours'} ${minutes} ${language === 'vi' ? 'phút' : 'minutes'}`;
}

function buildAISummaryInsight(
    incident: AdminIncident,
    language: 'vi' | 'en',
    translateCategory: (name?: string | null) => string
) {
    const imageWithAi = incident.images?.find((img) => img.ai_analysis && (img.ai_analysis.summary || img.ai_analysis.label));
    const aiData = incident.ai_analysis || imageWithAi?.ai_analysis || null;

    const rawText = `${incident.title || ''} ${incident.description || ''} ${incident.category_name || ''}`
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase();

    // Determine recommended department & default tags based on category / text
    let unitVi = 'Đội Quản lý Trật tự & Hạ tầng Đô thị';
    let unitEn = 'Urban Infrastructure & Order Response Unit';
    let defaultTagsVi = ['Hạ tầng đô thị', 'Cần kiểm tra hiện trường'];
    let defaultTagsEn = ['Urban infrastructure', 'Field inspection needed'];

    if (/chay|lua|khoi|fire|emergency|explosion/.test(rawText)) {
        unitVi = 'Lực lượng Cảnh sát PCCC & CNCH (114)';
        unitEn = 'Fire Prevention & Rescue Force (114)';
        defaultTagsVi = ['Nguy cơ cháy nổ', 'Khẩn cấp', 'Cần xử lý ngay'];
        defaultTagsEn = ['Fire hazard', 'Emergency', 'Immediate dispatch'];
    } else if (/day cap|cap vien thong|cable|wiring/.test(rawText)) {
        unitVi = 'Đội Quản lý Cáp viễn thông & Điện lực';
        unitEn = 'Telecom Cabling & Utility Grid Team';
        defaultTagsVi = ['Cáp viễn thông', 'An toàn lưới điện', 'Mỹ quan đô thị'];
        defaultTagsEn = ['Overhead cables', 'Grid safety', 'Street clearance'];
    } else if (/tieng on|khoi bui|o nhiem|noise|pollution/.test(rawText)) {
        unitVi = 'Phòng Tài nguyên & Môi trường / UBND Phường';
        unitEn = 'Environmental & Ward Inspection Team';
        defaultTagsVi = ['Môi trường đô thị', 'Tiếng ồn / Khói bụi', 'Khu dân cư'];
        defaultTagsEn = ['Environmental issue', 'Noise / Air quality', 'Residential area'];
    } else if (/bien bao|tin hieu|den giao thong|signal|sign/.test(rawText)) {
        unitVi = 'Trung tâm Quản lý Điều hành Giao thông Đô thị';
        unitEn = 'Urban Traffic Signal & Signage Center';
        defaultTagsVi = ['Tín hiệu giao thông', 'Biển báo đường bộ', 'An toàn nút giao'];
        defaultTagsEn = ['Traffic signal', 'Road signage', 'Intersection safety'];
    } else if (/via he|lan chiem|sidewalk|encroachment/.test(rawText)) {
        unitVi = 'Đội Quản lý Trật tự Đô thị Phường / Quận';
        unitEn = 'Ward Urban Order & Sidewalk Management Team';
        defaultTagsVi = ['Hạ tầng vỉa hè', 'Lối đi bộ', 'Trật tự đô thị'];
        defaultTagsEn = ['Sidewalk access', 'Pedestrian safety', 'Urban order'];
    } else if (/ngap|nuoc thai|ong nuoc|flood|wastewater/.test(rawText)) {
        unitVi = 'Công ty TNHH MTV Thoát nước Đô thị / Cấp nước';
        unitEn = 'Urban Drainage & Water Supply Company';
        defaultTagsVi = ['Ngập úng cục bộ', 'Cấp thoát nước', 'Ảnh hưởng lưu thông'];
        defaultTagsEn = ['Street flooding', 'Water & drainage', 'Traffic impact'];
    } else if (/cong tac|ho ga|thoat nuoc|drain|manhole/.test(rawText)) {
        unitVi = 'Đội Duy tu Cống thoát nước & Hố ga';
        unitEn = 'Storm Drain & Manhole Maintenance Crew';
        defaultTagsVi = ['Cống thoát nước', 'An toàn hố ga', 'Khơi thông dòng chảy'];
        defaultTagsEn = ['Storm drain', 'Manhole hazard', 'Drainage clearance'];
    } else if (/tac duong|ket xe|un tac|congestion|traffic jam/.test(rawText)) {
        unitVi = 'Đội CSGT & Điều tiết Giao thông Khu vực';
        unitEn = 'Regional Traffic Police & Dispatch Unit';
        defaultTagsVi = ['Ùn tắc giao thông', 'Cần điều tiết', 'Điểm nóng lưu thông'];
        defaultTagsEn = ['Traffic congestion', 'Flow control needed', 'Bottleneck'];
    } else if (/rac|ve sinh|xa ban|waste|litter|trash/.test(rawText)) {
        unitVi = 'Công ty Dịch vụ Công ích & Môi trường Đô thị';
        unitEn = 'Public Sanitation & Waste Management Service';
        defaultTagsVi = ['Vệ sinh môi trường', 'Thu gom rác thải', 'Mỹ quan công cộng'];
        defaultTagsEn = ['Public sanitation', 'Waste collection', 'Cleanliness'];
    } else if (/cay|canh cay|tree|branch/.test(rawText)) {
        unitVi = 'Công ty TNHH MTV Công viên Cây xanh';
        unitEn = 'Urban Parks & Green Trees Company';
        defaultTagsVi = ['Cây xanh đô thị', 'Cắt tỉa / Thu dọn', 'An toàn mùa mưa'];
        defaultTagsEn = ['Urban forestry', 'Branch clearance', 'Roadside safety'];
    } else if (/den duong|mat dien|chieu sang|streetlight|power/.test(rawText)) {
        unitVi = 'Công ty Chiếu sáng Công cộng / Điện lực Khu vực';
        unitEn = 'Public Streetlighting & Power Utility Team';
        defaultTagsVi = ['Chiếu sáng công cộng', 'An toàn điện', 'An ninh ban đêm'];
        defaultTagsEn = ['Street lighting', 'Electrical safety', 'Night visibility'];
    } else if (/duong|o ga|sut lun|road|pothole/.test(rawText)) {
        unitVi = 'Đội Duy tu Sửa chữa Hạ tầng Giao thông Bộ';
        unitEn = 'Road Surface Maintenance & Repair Unit';
        defaultTagsVi = ['Hư hỏng mặt đường', 'Ổ gà / Sụt lún', 'An toàn phương tiện'];
        defaultTagsEn = ['Road surface damage', 'Pothole hazard', 'Vehicle safety'];
    }

    // Infer recommended severity if AI didn't explicitly return one
    let suggestedSeverity: AdminIncident['priority'] = aiData?.severity_suggestion || incident.priority;
    if (!aiData?.severity_suggestion) {
        if (/chay|no|sap|nguy kich|dut day dien|mat nap ho ga|chan ngang duong|critical|collapse|live wire/.test(rawText)) {
            suggestedSeverity = 'critical';
        } else if (/ngap sau|o ga lon|nguy hiem|gay do|tai nan|high|deep flood|large pothole/.test(rawText)) {
            suggestedSeverity = 'high';
        }
    }

    const categoryLabel = translateCategory(incident.ai_suggested_category_name || incident.category_name);
    const locationText = incident.location_name || (language === 'vi' ? 'khu vực được ghim trên bản đồ' : 'the pinned map coordinates');
    const beforeCount = incident.images?.filter((img) => img.is_before).length || incident.image_urls?.length || 0;
    const afterCount = incident.images?.filter((img) => !img.is_before).length || 0;

    const confidenceVal =
        incident.ai_confidence !== null && incident.ai_confidence !== undefined
            ? Math.round(Number(incident.ai_confidence) * 100)
            : aiData?.confidence !== null && aiData?.confidence !== undefined
                ? Math.round(Number(aiData.confidence) * 100)
                : null;

    const nextActionVi =
        incident.status === 'pending'
            ? `Khuyến nghị phân công ngay cho "${unitVi}" để khảo sát hiện trường và xử lý trong khung SLA ${slaHours[incident.priority]} giờ.`
            : incident.status === 'assigned'
                ? `Đã giao cho nhân sự phụ trách (${incident.assigned_technician || 'Kỹ thuật viên'}). Cần đôn đốc cập nhật trạng thái sang "Đang xử lý" khi tới hiện trường.`
                : incident.status === 'in_progress'
                    ? `Đội kỹ thuật đang xử lý tại hiện trường. Lưu ý yêu cầu tải lên ảnh nghiệm thu sau xử lý trước khi đóng hồ sơ.`
                    : incident.status === 'completed'
                        ? `Sự cố đã được khắc phục hoàn tất (${afterCount} ảnh nghiệm thu)${incident.citizen_rating ? `, người dân đánh giá ${incident.citizen_rating}/5 sao.` : ', đang chờ đánh giá từ người dân.'}`
                        : `Báo cáo đã bị từ chối xử lý.`;

    const nextActionEn =
        incident.status === 'pending'
            ? `Recommended action: Assign immediately to "${unitEn}" for field verification within the ${slaHours[incident.priority]}-hour SLA window.`
            : incident.status === 'assigned'
                ? `Assigned to field staff (${incident.assigned_technician || 'Technician'}). Monitor transition to "In Progress" upon site arrival.`
                : incident.status === 'in_progress'
                    ? `Field resolution is underway. Ensure post-resolution verification photos are uploaded before marking as Completed.`
                    : incident.status === 'completed'
                        ? `Incident resolved (${afterCount} verification photo(s))${incident.citizen_rating ? ` with a ${incident.citizen_rating}/5 citizen rating.` : ', awaiting citizen feedback.'}`
                        : `This report was rejected.`;

    const duplicateNoteVi =
        (incident.nearby_incident_count ?? 0) > 0
            ? ` Phát hiện có ${incident.nearby_incident_count} báo cáo khác trong bán kính 50m — nên gộp tuyến xử lý cùng lúc.`
            : '';
    const duplicateNoteEn =
        (incident.nearby_incident_count ?? 0) > 0
            ? ` Detected ${incident.nearby_incident_count} nearby report(s) within 50m — consider batching field dispatch.`
            : '';

    const executiveSummary =
        language === 'vi'
            ? `Phản ánh về "${incident.title}" thuộc nhóm ${categoryLabel || 'Hạ tầng đô thị'} tại ${locationText}${beforeCount > 0 ? ` (kèm ${beforeCount} ảnh hiện trường)` : ' (chưa đính kèm ảnh hiện trường)'}. ${incident.description ? `Nội dung ghi nhận: "${incident.description.slice(0, 160)}${incident.description.length > 160 ? '...' : ''}".` : ''}${duplicateNoteVi} ${nextActionVi}`
            : `Report regarding "${incident.title}" categorized under ${categoryLabel || 'Urban Infrastructure'} at ${locationText}${beforeCount > 0 ? ` (${beforeCount} field photo(s) attached)` : ' (no field photo attached)'}. ${incident.description ? `Reported details: "${incident.description.slice(0, 160)}${incident.description.length > 160 ? '...' : ''}".` : ''}${duplicateNoteEn} ${nextActionEn}`;

    const tags =
        aiData?.tags && aiData.tags.length > 0
            ? aiData.tags
            : language === 'vi'
                ? [
                      ...defaultTagsVi,
                      beforeCount > 0 ? `${beforeCount} ảnh minh chứng` : 'Báo cáo văn bản',
                      `SLA ${slaHours[incident.priority]}h`,
                  ]
                : [
                      ...defaultTagsEn,
                      beforeCount > 0 ? `${beforeCount} evidence photo(s)` : 'Text report',
                      `SLA ${slaHours[incident.priority]}h`,
                  ];

    return {
        executiveSummary,
        geminiVisionSummary: aiData?.summary || null,
        geminiLabel: aiData?.label || null,
        confidenceVal,
        suggestedCategoryName: categoryLabel || (language === 'vi' ? 'Hạ tầng đô thị' : 'Urban Infrastructure'),
        suggestedSeverity,
        recommendedUnit: language === 'vi' ? unitVi : unitEn,
        tags,
    };
}

export default function IncidentDetail() {
    const { user } = useAuth();
    const { language, t, translateCategory } = useLanguage();
    const canManageIncident = user.role === 'super_admin' || user.role === 'manager';
    const { id } = useParams();
    const navigate = useNavigate();
    const [incident, setIncident] = useState<AdminIncident | null>(null);
    const [status, setStatus] = useState('Mới');
    const [rejectionReason, setRejectionReason] = useState('');
    const [priority, setPriority] = useState('Trung bình');
    const [assignee, setAssignee] = useState('Chưa phân công');
    const [assigneeError, setAssigneeError] = useState('');
    const [assigneeId, setAssigneeId] = useState<number | null>(null);
    const [note, setNote] = useState('');
    const [feedback, setFeedback] = useState('');
    const [staff, setStaff] = useState<AssignableAdmin[]>([]);
    const [notes, setNotes] = useState<AdminIncidentNote[]>([]);
    const [history, setHistory] = useState<AdminIncidentHistory[]>([]);
    const [activityWarning, setActivityWarning] = useState('');
    const [noteSaving, setNoteSaving] = useState(false);
    const [notifying, setNotifying] = useState(false);
    const [uploadingAfter, setUploadingAfter] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [updating, setUpdating] = useState(false);
    const [updateConfirmed, setUpdateConfirmed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [noticeType, setNoticeType] = useState<'success' | 'error'>('success');
    const [now, setNow] = useState(() => Date.now());

    const loadActivity = useCallback(async (incidentId: number, assignedTo: number | null, assignedName?: string) => {
        const [historyResult, notesResult, staffResult] = await Promise.allSettled([
            adminApi.getIncidentHistory(incidentId),
            adminApi.getIncidentNotes(incidentId),
            canManageIncident ? adminApi.getAssignableStaff() : Promise.resolve(null),
        ]);
        const warnings: string[] = [];
        if (historyResult.status === 'fulfilled') setHistory(historyResult.value.data);
        else { setHistory([]); warnings.push(t('Không tải được lịch sử xử lý.', 'Could not load activity history.')); }
        if (notesResult.status === 'fulfilled') setNotes(notesResult.value.data);
        else { setNotes([]); warnings.push(t('Không tải được ghi chú.', 'Could not load notes.')); }
        if (staffResult.status === 'fulfilled' && staffResult.value) {
            const accounts = staffResult.value.data;
            const currentAssignee = accounts.find((person) => person.id === assignedTo);
            setStaff(accounts);
            setAssigneeId(assignedTo);
            setAssignee(currentAssignee ? staffOptionLabel(currentAssignee) : assignedName || '');
        } else if (canManageIncident) {
            setStaff([]);
            setAssigneeId(assignedTo);
            setAssignee(assignedName || '');
            warnings.push(t('Không tải được danh sách nhân viên.', 'Could not load the staff list.'));
        }
        setActivityWarning(warnings.join(' '));
    }, [canManageIncident, t]);

    const loadIncident = useCallback(async () => {
        const incidentId = Number(id);
        if (!id || !Number.isInteger(incidentId) || incidentId < 1) {
            setError(t('Mã báo cáo không hợp lệ.', 'Invalid report ID.'));
            setLoading(false);
            return;
        }
        setLoading(true); setError('');
        try {
            const response = await adminApi.getIncident(incidentId);
            setIncident(response.data); setStatus(statusLabels[response.data.status]); setPriority(priorityLabels[response.data.priority]);
            await loadActivity(incidentId, response.data.assigned_to ?? null, response.data.assigned_technician);
        } catch (reason) { setError(reason instanceof Error ? reason.message : t('Không thể tải chi tiết báo cáo.', 'Could not load incident details.')); }
        finally { setLoading(false); }
    }, [id, loadActivity, t]);

    useEffect(() => {
        const timer = window.setTimeout(() => { void loadIncident(); }, 0);
        return () => window.clearTimeout(timer);
    }, [loadIncident]);
    useEffect(() => {
        if (!incident || !canManageIncident) return;

        let cancelled = false;
        const refreshPresence = async () => {
            try {
                const response = await adminApi.getAssignableStaff();
                if (!cancelled) setStaff(response.data);
            } catch {
                // Keep the last known presence state if a refresh briefly fails.
            }
        };
        const timer = window.setInterval(() => { void refreshPresence(); }, 30_000);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [incident, canManageIncident]);
    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(timer);
    }, []);
    if (loading) return <div className="rounded-xl bg-white p-12 text-center text-sm text-neutral-500">{t('Đang tải chi tiết báo cáo...', 'Loading incident details...')}</div>;
    if (error || !incident) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-danger">{error || t('Không tìm thấy báo cáo.', 'Incident not found.')}<button type="button" onClick={() => void loadIncident()} className="ml-3 inline-flex items-center gap-1 font-semibold underline"><RefreshCw size={14} />{t('Thử lại', 'Retry')}</button></div>;

    const latitude = incident.latitude ?? 10.7769;
    const longitude = incident.longitude ?? 106.7009;
    const slaDeadline = parseDatabaseDateTime(incident.created_at).getTime() + slaHours[incident.priority] * 60 * 60 * 1000;
    const slaRemaining = slaDeadline - now;
    const isTerminal = status === 'Hoàn tất' || status === 'Từ chối';
    const slaOverdue = !isTerminal && slaRemaining <= 0;
    const aiInsight = buildAISummaryInsight(incident, language, translateCategory);
    const suggestedPriorityVi = priorityLabels[aiInsight.suggestedSeverity];
    const infoRows: InfoRow[] = [
        { label: t('Mã sự cố', 'Incident ID'), value: `BC-${incident.id}` }, { label: t('Danh mục', 'Category'), value: incident.category_name ? translateCategory(incident.category_name) : t(`Danh mục ${incident.category_id}`, `Category ${incident.category_id}`) }, { label: t('Khu vực', 'Area'), value: incident.location_name || t('Chưa cập nhật', 'Not provided') }, { label: t('Địa chỉ', 'Address'), value: incident.location_name || t('Chưa cập nhật', 'Not provided') }, { label: t('Người phản ánh', 'Reporter'), value: <span>{incident.user_name || incident.user_email || t('Không xác định', 'Unspecified')}<span className="mt-1 block text-xs font-normal text-neutral-500">{incident.user_phone || t('Chưa cập nhật SĐT', 'Phone not provided')}</span></span> }, { label: t('Kênh tiếp nhận', 'Submission channel'), value: 'UIRMS' },
    ];
    const logs: HistoryLog[] = history.map((entry) => {
        const action = entry.action === 'assigned' ? 'Đã cập nhật phân công' : entry.action === 'status_changed' ? 'Đã cập nhật trạng thái' : 'Đã thêm ghi chú';
        const assignedStaff = staff.find((person) => person.id === entry.new_assigned_to);
        const detail = entry.action === 'status_changed'
            ? `${t(displayStatus(entry.old_status), ({ 'Mới': 'Pending', 'Đã tiếp nhận': 'Assigned', 'Đang xử lý': 'In Progress', 'Hoàn tất': 'Completed', 'Từ chối': 'Rejected', 'Chưa xác định': 'Unspecified' } as Record<string, string>)[displayStatus(entry.old_status)] || displayStatus(entry.old_status))} → ${t(displayStatus(entry.new_status), ({ 'Mới': 'Pending', 'Đã tiếp nhận': 'Assigned', 'Đang xử lý': 'In Progress', 'Hoàn tất': 'Completed', 'Từ chối': 'Rejected', 'Chưa xác định': 'Unspecified' } as Record<string, string>)[displayStatus(entry.new_status)] || displayStatus(entry.new_status))}${entry.note ? ` · ${t('Lý do:', 'Reason:')} ${entry.note}` : ''}`
            : entry.action === 'assigned'
                ? `${t('Nhân viên:', 'Assignee:')} ${assignedStaff?.full_name || assignedStaff?.username || t('Chưa phân công', 'Unassigned')}`
                : entry.note || undefined;
        return { id: String(entry.id), action, timestamp: formatVietnamDateTime(entry.created_at), actor: entry.performed_by_name || t('Quản trị viên', 'Administrator'), detail };
    });
    const saveChanges = async () => {
        if (updating) return;
        if (canManageIncident && assignee.trim() && assigneeId === null) {
            setAssigneeError(t('Chọn một kỹ thuật viên trong danh sách gợi ý.', 'Select a technician from the suggestions.'));
            setNotice('');
            return;
        }
        const nextStatus = statusToApi[status];
        if (nextStatus === 'rejected' && nextStatus !== incident.status && !rejectionReason.trim()) {
            setNoticeType('error');
            setNotice(t('Vui lòng nhập lý do từ chối.', 'Please enter a rejection reason.'));
            return;
        }
        if (nextStatus === 'completed' && !incident.images?.some((image) => !image.is_before)) {
            setNoticeType('error');
            setNotice(t('Cần tải ảnh kết quả sau xử lý trước khi hoàn tất sự cố.', 'Upload a resolution photo before completing this incident.'));
            return;
        }
        setUpdating(true);
        setUpdateConfirmed(false);
        try {
            const statusChanged = nextStatus && nextStatus !== incident.status;
            const assigneeChanged = assigneeId !== (incident.assigned_to ?? null);
            const nextPriority = priorityToApi[priority] || 'medium';
            const priorityChanged = nextPriority !== incident.priority;
            if (canManageIncident && (assigneeChanged || priorityChanged)) {
                await adminApi.assignIncident(incident.id, {
                    ...(assigneeChanged ? { assigned_to: assigneeId } : {}),
                    ...(priorityChanged ? { priority: nextPriority } : {}),
                });
            }
            if (statusChanged && (canManageIncident || ['in_progress', 'completed'].includes(nextStatus))) {
                await adminApi.updateIncidentStatus(incident.id, nextStatus, nextStatus === 'rejected' ? rejectionReason.trim() : undefined);
            }
            if (!statusChanged && (!canManageIncident || (!assigneeChanged && !priorityChanged))) {
                setNoticeType('success');
                setNotice(t('Không có thay đổi cần cập nhật.', 'There are no changes to save.'));
                setUpdateConfirmed(true);
                window.setTimeout(() => setUpdateConfirmed(false), 1600);
                return;
            }
            setNoticeType('success');
            setNotice(t('Đã cập nhật báo cáo.', 'Report updated.'));
            setUpdateConfirmed(true);
            window.setTimeout(() => setUpdateConfirmed(false), 1600);
            await loadIncident();
        } catch (reason) {
            setNoticeType('error');
            setNotice(reason instanceof Error ? reason.message : t('Cập nhật thất bại.', 'Update failed.'));
        } finally {
            setUpdating(false);
        }
    };
    const saveNote = async () => {
        if (!note.trim()) return false;
        setNoteSaving(true);
        try {
            await adminApi.addIncidentNote(incident.id, note.trim());
            setNote('');
            setNoticeType('success');
            setNotice(t('Đã lưu ghi chú.', 'Note saved.'));
            await loadActivity(incident.id, incident.assigned_to ?? null, incident.assigned_technician);
            return true;
        } catch (reason) { setNotice(reason instanceof Error ? reason.message : t('Lưu ghi chú thất bại.', 'Could not save note.')); }
        finally { setNoteSaving(false); }
        setNoticeType('error');
        return false;
    };
    const sendNotification = async () => {
        const message = feedback.trim();
        if (!message) return false;
        if (!incident.user_id) {
            setNoticeType('error');
            setNotice(t('Không tìm thấy người gửi báo cáo để nhận thông báo.', 'Could not find the report submitter to notify.'));
            return false;
        }
        setNotifying(true);
        try {
            await adminApi.sendAdminNotification({ user_id: incident.user_id, incident_id: incident.id, title: `Cập nhật báo cáo BC-${incident.id}`, message, type: 'new_reply' });
            setFeedback('');
            setNoticeType('success');
            setNotice(t('Đã gửi thông báo cho công dân.', 'Notification sent to the resident.'));
            return true;
        } catch (reason) {
            setNoticeType('error');
            setNotice(reason instanceof Error ? reason.message : t('Gửi thông báo thất bại.', 'Could not send notification.'));
            return false;
        }
        finally { setNotifying(false); }
    };

    const uploadAfterImage = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setUploadError(t('Chỉ chấp nhận tệp hình ảnh.', 'Only image files are accepted.'));
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setUploadError(t('Ảnh không được vượt quá 10 MB.', 'Image size must not exceed 10 MB.'));
            return;
        }
        setUploadingAfter(true);
        setUploadError('');
        try {
            await adminApi.uploadIncidentAfterImage(incident.id, file);
            const refreshed = await adminApi.getIncident(incident.id);
            setIncident(refreshed.data);
            setNoticeType('success');
            setNotice(t('Đã tải ảnh nghiệm thu.', 'Verification photo uploaded.'));
        } catch (reason) {
            setUploadError(reason instanceof Error ? reason.message : t('Không thể tải ảnh nghiệm thu.', 'Could not upload the verification photo.'));
        } finally {
            setUploadingAfter(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-neutral-500"><Link to="/incidents" className="hover:text-primary">{t('Danh sách báo cáo', 'Incident Reports')}</Link><span>/</span><span className="font-medium text-neutral-900">BC-{incident.id}</span></div>
            <div className="flex items-start justify-between gap-6"><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-bold text-neutral-900">{incident.title}</h1><span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeClass(status)}`}>{t(status, ({ 'Mới': 'Pending', 'Đã tiếp nhận': 'Assigned', 'Đang xử lý': 'In Progress', 'Hoàn tất': 'Completed', 'Từ chối': 'Rejected' })[status] || status)}</span><span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeClass(priority)}`}>{t(priority, ({ 'Thấp': 'Low', 'Trung bình': 'Medium', 'Cao': 'High', 'Khẩn cấp': 'Critical' })[priority] || priority)}</span></div><p className="mt-3 text-sm text-neutral-500">{t('Mã báo cáo:', 'Report ID:')} <b className="text-neutral-900">BC-{incident.id}</b> · {t('Tạo ngày', 'Created')} {formatVietnamDateTime(incident.created_at)}</p></div><button type="button" onClick={() => navigate('/incidents')} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-500"><ArrowLeft size={16} />{t('Quay lại', 'Back')}</button></div>
            <div role="timer" aria-live="off" className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${slaOverdue ? 'animate-pulse border-red-300 bg-red-50 text-danger' : 'border-slate-200 bg-white text-neutral-700'}`}><Clock3 size={18} className={slaOverdue ? 'text-danger' : 'text-primary'} /><div><p className="text-xs font-semibold">SLA · {t('Mục tiêu', 'Target')} {slaHours[incident.priority]} {t('giờ từ lúc tiếp nhận', 'hours from receipt')}</p><p className="mt-0.5 text-sm font-bold">{status === 'Hoàn tất' ? t('Đã hoàn tất', 'Completed') : status === 'Từ chối' ? t('Đã từ chối', 'Rejected') : slaOverdue ? `${t('Quá hạn', 'Overdue by')} ${formatDuration(slaRemaining, language)}` : `${t('Còn', 'Remaining')} ${formatDuration(slaRemaining, language)}`}</p></div></div>

            {/* AI Executive Summary & Triage Card */}
            <section className="overflow-hidden rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-blue-50/70 to-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 pb-3.5">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                            <Bot size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-slate-900">
                                    {t('Tóm Tắt & Thẩm Định Thông Minh (UIRMS AI)', 'AI Executive Summary & Triage Assessment')}
                                </h2>
                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-800">
                                    <Sparkles size={12} />
                                    AI Summary
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                {t(
                                    'Tổng hợp tự động từ nội dung phản ánh, ảnh hiện trường, mật độ không gian và quy chuẩn SLA',
                                    'Synthesized from report details, field photos, spatial density, and SLA targets'
                                )}
                            </p>
                        </div>
                    </div>
                    {aiInsight.confidenceVal !== null ? (
                        <div className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-1.5 shadow-2xs">
                            <span className="text-xs font-medium text-slate-600">{t('Độ tin cậy AI:', 'AI Confidence:')}</span>
                            <span className={`text-xs font-extrabold ${aiInsight.confidenceVal >= 80 ? 'text-emerald-600' : aiInsight.confidenceVal >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>
                                {aiInsight.confidenceVal}%
                            </span>
                        </div>
                    ) : (
                        <span className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                            {t('Tự động phân tích hồ sơ', 'Automated Case Triage')}
                        </span>
                    )}
                </div>

                {/* Main Executive Summary Paragraph */}
                <div className="mt-4 rounded-lg border border-indigo-100/80 bg-white/95 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                        {t('Tóm tắt điều phối nhanh', 'Executive Triage Summary')}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                        {aiInsight.executiveSummary}
                    </p>
                    {aiInsight.geminiVisionSummary && (
                        <div className="mt-3 border-t border-slate-100 pt-2.5 text-xs text-slate-600">
                            <span className="font-semibold text-indigo-900">
                                {t('Nhận diện thị giác máy tính (Gemini Vision): ', 'Gemini Vision Image Analysis: ')}
                            </span>
                            <span>{aiInsight.geminiVisionSummary}</span>
                            {aiInsight.geminiLabel && (
                                <span className="ml-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                                    {aiInsight.geminiLabel}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* 3-Column AI Triage Metrics */}
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-200/80 bg-white p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {t('Danh mục thẩm định', 'Assessed Category')}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{aiInsight.suggestedCategoryName}</p>
                        <p className="mt-1 text-xs text-emerald-700">
                            ✓ {t('Phù hợp phân loại chuyên môn', 'Aligned with domain routing')}
                        </p>
                    </div>

                    <div className="rounded-lg border border-slate-200/80 bg-white p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {t('Mức độ ưu tiên đề xuất', 'Suggested Severity')}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${badgeClass(suggestedPriorityVi)}`}>
                                {t(suggestedPriorityVi, ({ 'Thấp': 'Low', 'Trung bình': 'Medium', 'Cao': 'High', 'Khẩn cấp': 'Critical' })[suggestedPriorityVi] || suggestedPriorityVi)}
                            </span>
                            {canManageIncident && suggestedPriorityVi !== priority && (
                                <button
                                    type="button"
                                    onClick={() => setPriority(suggestedPriorityVi)}
                                    className="rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-indigo-700"
                                >
                                    {t('Áp dụng mức này', 'Apply level')}
                                </button>
                            )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                            {suggestedPriorityVi === priority
                                ? t('Khớp với mức ưu tiên hiện tại', 'Matches current priority')
                                : t('Khác với mức đang chọn ở bảng xử lý', 'Differs from selected priority')}
                        </p>
                    </div>

                    <div className="rounded-lg border border-slate-200/80 bg-white p-3.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            {t('Đơn vị chuyên trách gợi ý', 'Recommended Response Unit')}
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-900">{aiInsight.recommendedUnit}</p>
                        <p className="mt-1 text-xs text-slate-500">
                            {t(`SLA mục tiêu: ${slaHours[incident.priority]} giờ`, `Target SLA: ${slaHours[incident.priority]} hours`)}
                        </p>
                    </div>
                </div>

                {/* Context & Visual Tags */}
                <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs font-semibold text-slate-500">
                        {t('Thẻ nhận diện:', 'Context Tags:')}
                    </span>
                    {aiInsight.tags.map((tag, index) => (
                        <span
                            key={`${tag}-${index}`}
                            className="rounded-full border border-indigo-200/80 bg-indigo-50/80 px-2.5 py-0.5 text-xs font-medium text-indigo-900"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            </section>
            {(incident.is_duplicate || (incident.nearby_incident_count ?? 0) > 0) && <section role="status" className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"><AlertTriangle size={19} className="mt-0.5 shrink-0 text-amber-700" /><div><p className="font-semibold">{t('Có khả năng báo cáo trùng lặp', 'Possible duplicate report')}</p><p className="mt-0.5">{incident.nearby_incident_count ? t(`Có ${incident.nearby_incident_count} báo cáo khác trong bán kính 50m.`, `${incident.nearby_incident_count} other reports are within 50 m.`) : t('Báo cáo này đã được đánh dấu trùng lặp.', 'This report has been marked as a duplicate.')}{incident.duplicate_of ? ` ${t('Báo cáo gốc:', 'Original report:')} BC-${incident.duplicate_of}${incident.duplicate_of_title ? ` · ${incident.duplicate_of_title}` : ''}.` : ''}</p></div></section>}
            {notice && <div role={noticeType === 'error' ? 'alert' : 'status'} className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold ${noticeType === 'error' ? 'bg-red-50 text-danger' : 'bg-green-50 text-success'}`}>{noticeType === 'success' && <CheckCircle2 size={16} />}{notice}</div>}
            {activityWarning && <div role="status" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{activityWarning}</div>}
            <div className="grid grid-cols-[minmax(0,1.85fr)_minmax(330px,1fr)] items-start gap-6">
                <div className="space-y-6">
                    <InfoCard title={t('Thông Tin Chi Tiết', 'Incident Details')} rows={infoRows} />
                    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-base font-bold text-neutral-900">{t('Mô Tả Sự Cố', 'Incident Description')}</h2>
                        <p className="mt-4 text-sm leading-7 text-neutral-600">{incident.description || t('Không có mô tả.', 'No description provided.')}</p>
                    </section>
                    <ImageGallery images={incident.images || []} canUploadAfter={['super_admin', 'manager', 'technician'].includes(user.role)} uploadingAfter={uploadingAfter} uploadError={uploadError} onUploadAfter={uploadAfterImage} />
                    {(incident.status === 'completed' || incident.citizen_rating) && (
                        <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <Star size={18} className="fill-amber-400 text-amber-500" />
                                    <h2 className="text-base font-bold text-neutral-900">{t('Đánh Giá Nghiệm Thu Từ Người Dân', 'Citizen Resolution Feedback')}</h2>
                                </div>
                                {incident.citizen_feedback_at && (
                                    <span className="text-xs font-medium text-neutral-500">
                                        {formatVietnamDateTime(incident.citizen_feedback_at)}
                                    </span>
                                )}
                            </div>
                            {incident.citizen_rating ? (
                                <div className="mt-3 space-y-2">
                                    <div className="flex items-center gap-1.5">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                                key={star}
                                                size={18}
                                                className={star <= (incident.citizen_rating || 0) ? 'fill-amber-400 text-amber-500' : 'text-slate-300'}
                                            />
                                        ))}
                                        <span className="ml-2 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                                            {incident.citizen_rating}/5 {t('sao', 'stars')}
                                        </span>
                                    </div>
                                    {incident.citizen_feedback ? (
                                        <p className="rounded-lg border border-amber-200/80 bg-white px-3.5 py-2.5 text-sm italic text-neutral-700">
                                            "{incident.citizen_feedback}"
                                        </p>
                                    ) : (
                                        <p className="text-xs text-neutral-600">
                                            {t('Người dân đã đánh giá sao nhưng không để lại nhận xét văn bản.', 'The resident rated the resolution without a written comment.')}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="mt-2 text-sm text-neutral-600">
                                    {t('Sự cố đã hoàn tất. Đang chờ người phản ánh đánh giá mức độ hài lòng trên ứng dụng di động.', 'Incident completed. Waiting for the resident to rate the resolution on the mobile app.')}
                                </p>
                            )}
                        </section>
                    )}
                    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="p-5"><h2 className="text-base font-bold text-neutral-900">{t('Vị Trí Trên Bản Đồ', 'Map Location')}</h2></div><div className="h-[290px]"><MapContainer center={[latitude, longitude]} zoom={15} scrollWheelZoom={false} className="h-full w-full"><TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Marker position={[latitude, longitude]}><Popup>{incident.location_name || t('Vị trí báo cáo', 'Incident location')}</Popup></Marker></MapContainer></div><div className="flex items-center gap-2 px-5 py-3 text-sm text-neutral-600"><MapPin size={17} className="text-danger" />{incident.location_name || t('Chưa cập nhật địa chỉ', 'Address not provided')}</div></section>
                </div>
                <div className="space-y-6"><ProcessingPanel incidentId={incident.id} canManageIncident={canManageIncident} status={status} rejectionReason={rejectionReason} priority={priority} assignee={assignee} assigneeError={assigneeError} note={note} feedback={feedback} staff={staff} noteSaving={noteSaving} notifying={notifying} updating={updating} updateConfirmed={updateConfirmed} notes={notes} onStatusChange={setStatus} onRejectionReasonChange={setRejectionReason} onPriorityChange={setPriority} onAssigneeChange={(value) => { setAssignee(value); const matched = staff.find((person) => staffOptionLabel(person) === value || person.full_name === value || person.username === value); setAssigneeId(matched?.id ?? null); setAssigneeError(value && !matched ? t('Chọn một kỹ thuật viên trong danh sách gợi ý.', 'Select a technician from the suggestions.') : ''); }} onNoteChange={setNote} onAddNote={saveNote} onFeedbackChange={setFeedback} onUpdate={() => void saveChanges()} onNotify={sendNotification} /><HistoryTimeline logs={logs} /></div>
            </div>
        </div>
    );
}
