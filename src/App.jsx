import React, { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./supabase";
import { X, Plus, Trash2, Users, AlertTriangle, CheckCircle2, Search, RefreshCw, Check, UserCheck, List, XCircle, Undo2, ArrowRightLeft } from "lucide-react";

/**
 * Beit Al Ward — Live Wedding Seating, Check-in & Master Guest List
 *
 * Data model: a single flat GUESTS array is the source of truth.
 * Each guest: { id, name, count, tableId (null = not yet seated),
 *               attended, canceled, source }
 * Table views are derived by filtering this array — there is no
 * separate per-table list to keep in sync.
 */

// ---------- Table layout (mirrors the real Beit Al Ward floor plan) ----------
// bride: true => bride's side — shown in pink, but fully usable, not locked.
const TABLE_DEFS = [
  { id: 1, cap: 28, shape: "bigoval", x: 18.1, y: 61.6, bride: true },
  { id: 2, cap: 28, shape: "bigoval", x: 18.1, y: 38.4, bride: false },
  { id: 3, cap: 10, shape: "round", x: 18.0, y: 31.5, bride: false },
  { id: 4, cap: 10, shape: "round", x: 27.5, y: 20.6, bride: false },
  { id: 5, cap: 10, shape: "round", x: 40.4, y: 14.3, bride: false },
  { id: 9, cap: 10, shape: "round", x: 56.4, y: 13.6, bride: false },
  { id: 8, cap: 10, shape: "round", x: 90, y: 18, bride: false },
  { id: 10, cap: 10, shape: "round", x: 69.9, y: 18.8, bride: false },
  { id: 11, cap: 10, shape: "round", x: 80.3, y: 28.8, bride: false },
  { id: 12, cap: 28, shape: "bigoval", x: 81.9, y: 38.4, bride: false },
  { id: 13, cap: 28, shape: "bigoval", x: 81.9, y: 61.6, bride: false },
  { id: 14, cap: 10, shape: "round", x: 56.4, y: 86.4, bride: false },
  { id: 15, cap: 10, shape: "round", x: 69.9, y: 81.2, bride: false },
  { id: 16, cap: 10, shape: "round", x: 80.3, y: 71.2, bride: false },
  { id: 19, cap: 10, shape: "round", x: 43.6, y: 86.4, bride: true },
  { id: 20, cap: 10, shape: "round", x: 30.1, y: 81.2, bride: true },
  { id: 21, cap: 10, shape: "round", x: 19.7, y: 71.2, bride: true },
  { id: 22, cap: 16, shape: "film", x: 27.3, y: 60.6, bride: true },
  { id: 23, cap: 16, shape: "fan", x: 39.4, y: 72.7, bride: true },
  { id: 24, cap: 16, shape: "oval", x: 28.7, y: 55.7, bride: true },
  { id: 25, cap: 16, shape: "oval", x: 29.3, y: 42.5, bride: false },
  { id: 26, cap: 16, shape: "fan", x: 27.3, y: 39.4, bride: false },
  { id: 27, cap: 16, shape: "film", x: 39.4, y: 27.3, bride: false },
  { id: 28, cap: 16, shape: "film", x: 72.7, y: 39.4, bride: false },
  { id: 29, cap: 16, shape: "fan", x: 60.6, y: 27.3, bride: false },
  { id: 30, cap: 16, shape: "oval", x: 70.7, y: 42.5, bride: false },
  { id: 31, cap: 16, shape: "oval", x: 71.3, y: 55.7, bride: false },
  { id: 32, cap: 16, shape: "fan", x: 60.6, y: 72.7, bride: false },
  { id: 33, cap: 16, shape: "film", x: 72.7, y: 60.6, bride: false },
];

// ---------- Seed guest data: full master list from the guest spreadsheet ----------
// [id, name, count, tableId(null if unseated), attended, canceled, source]
const SEED_GUESTS = [
[1,"ربيع العرب",2,4,false,false,"final_v3"],
[2,"خليل معربوني",2,4,false,false,"final_v3"],
[3,"قاسم طعان",2,4,false,false,"final_v3"],
[4,"مامون نصير",2,4,false,false,"final_v3"],
[5,"عبد الرفيع",2,4,false,false,"final_v3"],
[6,"كمال حرب",2,3,false,false,"final_v3"],
[7,"عمر علي",2,3,false,false,"final_v3"],
[8,"عبد الله حرب",2,3,false,false,"final_v3"],
[9,"علي عكاش",2,3,false,false,"final_v3"],
[10,"معمر حرب",1,3,false,false,"final_v3"],
[11,"صلاح حرب",1,3,false,false,"final_v3"],
[12,"عمر حرب",2,2,false,false,"final_v3"],
[13,"رولا",2,2,false,false,"final_v3"],
[14,"عبد الله عمر حرب",5,2,false,false,"final_v3"],
[15,"بلال عمر حرب",4,2,false,false,"final_v3"],
[16,"علاء عمر حرب",4,2,false,false,"final_v3"],
[17,"مواهب",1,2,false,false,"final_v3"],
[18,"عمتي جمال جميل حرب",1,2,false,false,"final_v3"],
[19,"عدنان حرب",2,2,false,false,"final_v3"],
[20,"عادل حرب",2,2,false,false,"final_v3"],
[21,"رايفة + عايدة + منال",3,2,false,false,"final_v3"],
[22,"عبد الناصر عبدالرحمن",4,25,false,false,"final_v3"],
[23,"حج ابو منير عبد الرحمن",3,25,false,false,"final_v3"],
[24,"ام احمد عبد الرحمن",2,25,false,false,"final_v3"],
[25,"احمد عبد الرحمن",2,25,false,false,"final_v3"],
[26,"رواد عبد الرحمن",2,25,false,false,"final_v3"],
[27,"انس الرفيع",1,25,false,false,"final_v3"],
[28,"نوري عميرات",2,25,false,false,"final_v3"],
[29,"شفيق سلوم ابو علي",2,27,false,false,"final_v3"],
[30,"عمر غنوم صهر خالد",2,27,false,false,"final_v3"],
[31,"ابو خالد درويش",4,27,false,false,"final_v3"],
[32,"ليلوا سميدي",1,27,false,false,"final_v3"],
[33,"احمد صبرا",2,27,false,false,"final_v3"],
[34,"داني عساكر",1,27,false,false,"final_v3"],
[35,"نضال ريدان",2,27,false,false,"final_v3"],
[36,"سليمان ريدان",1,27,false,false,"final_v3"],
[37,"عمر سلوم",2,27,false,false,"final_v3"],
[38,"حكمت",2,26,false,false,"final_v3"],
[39,"ابو حكمت",2,26,false,false,"final_v3"],
[40,"حمودي صلح",4,26,false,false,"final_v3"],
[41,"حسام جوهري",1,26,false,false,"final_v3"],
[42,"عباس الجمال - رشا",2,26,false,false,"final_v3"],
[43,"مازن الحلاني",3,26,false,false,"final_v3"],
[44,"نسيم دباجة",2,26,false,false,"final_v3"],
[45,"محمد معين",4,12,false,false,"final_v3"],
[46,"عماد عكاش",2,12,false,false,"final_v3"],
[47,"محمد علي عكاش",2,12,false,false,"final_v3"],
[48,"ابو عبد الله",2,12,false,false,"final_v3"],
[49,"سعيد نسبيه",4,12,false,false,"final_v3"],
[50,"الحج عبد",5,12,false,false,"final_v3"],
[51,"نصرات الحمدانية",2,12,false,false,"final_v3"],
[52,"زاهر شعبان",2,12,false,false,"final_v3"],
[53,"وسيم بو عرب",2,12,false,false,"final_v3"],
[54,"احمد عامر - ماغي",2,12,false,false,"final_v3"],
[55,"علي زينب",1,11,false,false,"final_v3"],
[56,"محمد شفوني - اسيل",2,11,false,false,"final_v3"],
[57,"انور ابو عبدو",1,11,false,false,"final_v3"],
[58,"عبد سليمان",1,11,false,false,"final_v3"],
[59,"عبد الرحمن العموري",1,11,false,false,"final_v3"],
[60,"حسان الهواري",2,11,false,false,"final_v3"],
[61,"سعيد",1,10,false,false,"final_v3"],
[62,"زكريا",1,10,false,false,"final_v3"],
[63,"عبد الله قاروط",1,10,false,false,"final_v3"],
[64,"جورج توما",1,10,false,false,"final_v3"],
[65,"احمد علاء الدين",1,10,false,false,"final_v3"],
[66,"خالد حمادة",1,10,false,false,"final_v3"],
[67,"انس حايك",1,10,false,false,"final_v3"],
[68,"محمد كنايا",1,10,false,false,"final_v3"],
[69,"جيبون",1,10,false,false,"final_v3"],
[70,"علي بو دية",2,9,false,false,"final_v3"],
[71,"عمر جابر",2,9,false,false,"final_v3"],
[72,"مريم لويس",1,9,false,false,"final_v3"],
[73,"لين فقيه",1,9,false,false,"final_v3"],
[74,"شادي عقل",2,9,false,false,"final_v3"],
[75,"دانا فرحات",1,9,false,false,"final_v3"],
[76,"روبا و بشير",1,8,false,false,"final_v3"],
[77,"هند و امتثال",2,30,false,false,"final_v3"],
[78,"جمال حرب + نانا حماد",4,30,false,false,"final_v3"],
[79,"محمد شكر",1,30,false,false,"final_v3"],
[80,"اسامة زعرور",2,30,false,false,"final_v3"],
[81,"ماهر فرحات",2,30,false,false,"final_v3"],
[82,"غسان حرب",2,30,false,false,"final_v3"],
[83,"جرير حرب",2,30,false,false,"final_v3"],
[84,"ايمن حرب",1,30,false,false,"final_v3"],
[85,"حسام حرب",5,29,false,false,"final_v3"],
[86,"نعمان حرب",5,29,false,false,"final_v3"],
[87,"وائل حرب",4,29,false,false,"final_v3"],
[88,"ميرفت حرب",1,29,false,false,"final_v3"],
[89,"انتصار حرب",1,29,false,false,"final_v3"],
[90,"عمر عبد حرب",1,29,false,false,"final_v3"],
[91,"محمد عادل حرب",2,28,false,false,"final_v3"],
[92,"عبد الرحيم حرب",2,28,false,false,"final_v3"],
[93,"طارق عادل حرب",1,28,false,false,"final_v3"],
[94,"ابراهيم جراح",3,28,false,false,"final_v3"],
[95,"محمد حلبلب",2,28,false,false,"final_v3"],
[96,"عبدالله صلاح حرب",2,28,false,false,"final_v3"],
[97,"فؤاد كاظم حرب",2,28,false,false,"final_v3"],
[98,"طارق السيد",2,28,false,false,"final_v3"],
[99,"ام جوجو طراف",2,15,false,false,"final_v3"],
[100,"ربيع عقل",2,15,false,false,"final_v3"],
[101,"بشار السيد",2,15,false,false,"final_v3"],
[102,"محمد بدري درويش",2,15,false,false,"final_v3"],
[103,"محمد حسنة",2,15,false,false,"final_v3"],
[104,"اولاد معمر",5,16,false,false,"final_v3"],
[105,"هادي حرب",1,16,false,false,"final_v3"],
[106,"عمر حسين حرب",1,16,false,false,"final_v3"],
[107,"علي حسين حرب",1,16,false,false,"final_v3"],
[108,"نسيب رباح",1,16,false,false,"final_v3"],
[109,"عادل حرب",1,16,false,false,"final_v3"],
[110,"حسان حرب",2,14,false,false,"final_v3"],
[111,"زاهي حرب",2,14,false,false,"final_v3"],
[112,"عمر محمد حرب ابو جورج",2,14,false,false,"final_v3"],
[113,"احمد عبدالهادي حرب",2,14,false,false,"final_v3"],
[114,"عماد ابو عرب",2,14,false,false,"final_v3"],
[115,"سمير شريجي",2,13,false,false,"final_v3"],
[116,"قاسم الدسوقي",2,13,false,false,"final_v3"],
[117,"محمد الحمصي",2,13,false,false,"final_v3"],
[118,"بديع عبدالرحمن",2,13,false,false,"final_v3"],
[119,"عيسى",2,13,false,false,"final_v3"],
[120,"ابو جهاد - محمد العرول",2,13,false,false,"final_v3"],
[121,"محمد الفحل",2,13,false,false,"final_v3"],
[122,"فيصل يحي",2,13,false,false,"final_v3"],
[123,"رواد صالح",2,13,false,false,"final_v3"],
[124,"غصوب شموري",2,13,false,false,"final_v3"],
[125,"توفيق الحجيري",2,13,false,false,"final_v3"],
[126,"محمد قاسم",2,13,false,false,"final_v3"],
[127,"عماد عكرة",1,13,false,false,"final_v3"],
[128,"بلال صالح",2,13,false,false,"final_v3"],
[129,"ربيع امين",1,13,false,false,"final_v3"],
[130,"محمد صلاح",3,32,false,false,"final_v3"],
[131,"حسام رباح",2,32,false,false,"final_v3"],
[132,"عبد الناصر حرب",1,32,false,false,"final_v3"],
[133,"نهلة سلوم + طليع",2,32,false,false,"final_v3"],
[134,"جمال سلوم",1,32,false,false,"final_v3"],
[135,"حسين عمر حرب",3,32,false,false,"final_v3"],
[136,"مني مصطفى حرب",2,32,false,false,"final_v3"],
[137,"حسان حمدانيه",2,32,false,false,"final_v3"],
[138,"خالد حمود",2,33,false,false,"final_v3"],
[139,"محمد عبدالخالق",2,33,false,false,"final_v3"],
[140,"عمر الحشيمي",3,33,false,false,"final_v3"],
[141,"هيثم الميس",2,33,false,false,"final_v3"],
[142,"اياد جاجي",3,33,false,false,"final_v3"],
[143,"محمد مصطفى",4,33,false,false,"final_v3"],
[144,"احمد الميس",2,31,false,false,"final_v3"],
[145,"رمزي عواضة",2,31,false,false,"final_v3"],
[146,"آيات صلح",2,31,false,false,"final_v3"],
[147,"محمد عباس",2,31,false,false,"final_v3"],
[148,"مصطفى صلاح حرب",1,31,false,false,"final_v3"],
[149,"باسل اندراوس",2,31,false,false,"final_v3"],
[150,"جوزيف السرغاني",2,31,false,false,"final_v3"],
[151,"آية صالح",1,31,false,false,"final_v3"],
[152,"صلاح مصطفى حرب",1,31,false,false,"final_v3"],
[153,"عمر القطان",1,19,false,false,"final_v3"],
[154,"خضر ابو خضر",1,19,false,false,"final_v3"],
[155,"علي محرم",1,19,false,false,"final_v3"],
[156,"جمعه خضيري",1,20,false,false,"final_v3"],
[157,"عباس عوض",1,20,false,false,"final_v3"],
[158,"فادي عوضة",1,20,false,false,"final_v3"],
[159,"خالد هاشم",1,20,false,false,"final_v3"],
[160,"جهاد ابو الذهب",1,21,false,false,"final_v3"],
[161,"جمعة ابو الذهب",1,21,false,false,"final_v3"],
[162,"ناهدة ابو الذهب",1,21,false,false,"final_v3"],
[163,"مني دعيس",1,21,false,false,"final_v3"],
[164,"حجت ابو الذهب",1,1,false,false,"final_v3"],
[165,"عدنان ابو الذهب",1,1,false,false,"final_v3"],
[166,"خضر ابو الذهب",1,1,false,false,"final_v3"],
[167,"علي سلوم",1,1,false,false,"final_v3"],
[168,"محمود سلوم",1,1,false,false,"final_v3"],
[169,"نعمت سلوم",1,1,false,false,"final_v3"],
[170,"طارق طعان",1,1,false,false,"final_v3"],
[171,"حسان فرحات",1,1,false,false,"final_v3"],
[172,"خالد سلوم",1,1,false,false,"final_v3"],
[173,"مجد السعيد",1,22,false,false,"final_v3"],
[174,"عمار ابو ناصيف",1,22,false,false,"final_v3"],
[175,"هيثم يقطين",1,22,false,false,"final_v3"],
[176,"سناء ماضي",1,22,false,false,"final_v3"],
[177,"ايمن السيد",1,22,false,false,"final_v3"],
[178,"آلاء صوان",1,22,false,false,"final_v3"],
[179,"محمود غانم",1,22,false,false,"final_v3"],
[180,"ايمن سنتالي",1,22,false,false,"final_v3"],
[181,"سارة معروف",1,22,false,false,"final_v3"],
[182,"سارة العبسي",1,22,false,false,"final_v3"],
[183,"محمد كاسو",1,23,false,false,"final_v3"],
[184,"نورا كاسو",1,23,false,false,"final_v3"],
[185,"رودي كاسو",1,23,false,false,"final_v3"],
[186,"خالد فرحات",1,23,false,false,"final_v3"],
[187,"ام خالد فرحات",1,23,false,false,"final_v3"],
[188,"علي فرحات",1,23,false,false,"final_v3"],
[189,"محمد عقل",1,23,false,false,"final_v3"],
[190,"محمد بيرم",1,23,false,false,"final_v3"],
[191,"هيثم القادري",1,24,false,false,"final_v3"],
[192,"محمد الخطيب",1,24,false,false,"final_v3"],
[193,"محمد الحلاق",1,24,false,false,"final_v3"],
[194,"رنا تيري",1,24,false,false,"final_v3"],
[195,"حسين منصور",1,24,false,false,"final_v3"],
[196,"عليا سلوم",1,24,false,false,"final_v3"]
];

const SOURCE_LABELS = {
  mainFamily: "العائلة الأساسية",
  harbNeighbors: "عائلة حرب - جيران",
  hekmat: "أصدقاء حكمت",
  moein: "أصدقاء محمد معين",
  almeys: "أصدقاء أحمد الميس",
};

const COLLABORATORS = ["عزيز (Aziz)", "بلال (Bilal)", "عبدالله (Abdullah)", "رولا (Rola)", "علاء (Alaa)"];
const STORAGE_KEY = "beitalward-guests-v1";

function toGuestObj(row) {
  const [id, name, count, tableId, attended, canceled, source] = row;
  return { id, name, count: Number(count) || 0, tableId: tableId || null, attended: !!attended, canceled: !!canceled, source };
}
function normalizeGuests(list) {
  return (list || []).map((g) => Array.isArray(g) ? toGuestObj(g) : g);
}

function shapeStyle(shape) {
  switch (shape) {
    case "bigoval": return { borderRadius: "50%", width: 56, height: 34 };
    case "oval": return { borderRadius: "50%", width: 38, height: 24 };
    case "round": return { borderRadius: "50%", width: 32, height: 32 };
    case "film": return { borderRadius: 6, width: 38, height: 24 };
    case "fan": return { borderRadius: "50%", width: 46, height: 46 };
    default: return { borderRadius: "50%", width: 34, height: 34 };
  }
}

export default function App() {
  const [guests, setGuests] = useState(normalizeGuests(SEED_GUESTS));
  const [collaborator, setCollaborator] = useState(COLLABORATORS[0]);
  const [selected, setSelected] = useState(null);
  const [showGuestList, setShowGuestList] = useState(false);
  const [listFilter, setListFilter] = useState("all"); // all | seated | unseated | attended | canceled
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [listSearch, setListSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newCount, setNewCount] = useState(1);
  const [toast, setToast] = useState(null);
  const [pendingAssign, setPendingAssign] = useState(null); // { guestId, tableId, overBy }
  const lastLocalEditRef = React.useRef(0);

  const [connected, setConnected] = useState(false);
  const lastLocalEditRef2 = React.useRef(0);

  useEffect(() => {
    let channel;
    (async () => {
      const { data, error } = await supabase.from("seating_state").select("guests").eq("id", 1).single();
      if (error || !data || !data.guests || data.guests.length === 0) {
        const seeded = normalizeGuests(SEED_GUESTS);
        await supabase.from("seating_state").upsert({ id: 1, guests: seeded });
        setGuests(seeded);
      } else {
        setGuests(normalizeGuests(data.guests));
      }
      setConnected(true);
      setLoading(false);

      channel = supabase
        .channel("seating_state_changes")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "seating_state", filter: "id=eq.1" }, (payload) => {
          if (Date.now() - lastLocalEditRef2.current < 6000) return;
          if (payload.new && payload.new.guests) {
            setGuests((local) => {
              const remote = normalizeGuests(payload.new.guests);
              return JSON.stringify(remote) !== JSON.stringify(local) ? remote : local;
            });
          }
        })
        .subscribe();
    })();

    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  const persist = useCallback((next) => {
    lastLocalEditRef2.current = Date.now();
    setGuests(next);
    supabase.from("seating_state").update({ guests: next, updated_at: new Date().toISOString() }).eq("id", 1)
      .then(({ error }) => {
        if (error) {
          console.error("Save failed", error);
          setToast({ type: "error", msg: "فشل الحفظ — تحقق من الاتصال" });
        }
      });
  }, []);

  // ---- Derived stats ----
  const stats = useMemo(() => {
    let seated = 0, unseated = 0, attended = 0, canceled = 0, capacity = 0;
    TABLE_DEFS.forEach((t) => { capacity += t.cap; });
    const locations = {};
    guests.forEach((g) => {
      if (g.canceled) { canceled += g.count; return; }
      if (g.tableId) {
        seated += g.count;
        if (g.attended) attended += g.count;
      } else {
        unseated += g.count;
      }
      const key = g.name.trim();
      if (g.tableId) {
        if (!locations[key]) locations[key] = [];
        locations[key].push(g.tableId);
      }
    });
    const duplicates = Object.entries(locations).filter(([, tids]) => tids.length > 1);
    return { seated, unseated, attended, canceled, capacity, duplicates };
  }, [guests]);

  const tableUsage = useMemo(() => {
    const usage = {};
    TABLE_DEFS.forEach((t) => { usage[t.id] = { used: 0, attended: 0 }; });
    guests.forEach((g) => {
      if (g.canceled || !g.tableId) return;
      if (!usage[g.tableId]) return;
      usage[g.tableId].used += g.count;
      if (g.attended) usage[g.tableId].attended += g.count;
    });
    return usage;
  }, [guests]);

  const almostFull = useMemo(() => {
    return TABLE_DEFS.filter((t) => {
      const used = tableUsage[t.id]?.used || 0;
      const remaining = t.cap - used;
      return remaining > 0 && remaining <= 3;
    });
  }, [tableUsage]);

  const overCapacity = useMemo(() => {
    return TABLE_DEFS.filter((t) => (tableUsage[t.id]?.used || 0) > t.cap);
  }, [tableUsage]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.trim().toLowerCase();
    return guests.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 12);
  }, [search, guests]);

  const selectedTable = TABLE_DEFS.find((t) => t.id === selected);
  const selectedGuests = useMemo(() => guests.filter((g) => g.tableId === selected), [guests, selected]);
  const selectedUsed = tableUsage[selected]?.used || 0;
  const selectedAttended = tableUsage[selected]?.attended || 0;

  const filteredGuests = useMemo(() => {
    let rows = guests;
    if (listFilter === "seated") rows = rows.filter((g) => g.tableId && !g.canceled);
    else if (listFilter === "unseated") rows = rows.filter((g) => !g.tableId && !g.canceled);
    else if (listFilter === "attended") rows = rows.filter((g) => g.attended && !g.canceled);
    else if (listFilter === "canceled") rows = rows.filter((g) => g.canceled);
    if (listSearch.trim()) {
      const q = listSearch.trim().toLowerCase();
      rows = rows.filter((g) => g.name.toLowerCase().includes(q));
    }
    return rows;
  }, [guests, listFilter, listSearch]);

  function updateGuest(id, patch) {
    const next = guests.map((g) => (g.id === id ? { ...g, ...patch } : g));
    persist(next);
  }

  function addNewGuestToTable() {
    if (!selected || !newName.trim()) return;
    const cnt = Math.max(1, Number(newCount) || 1);
    const maxId = guests.reduce((m, g) => Math.max(m, g.id), 0);
    const next = [...guests, { id: maxId + 1, name: newName.trim(), count: cnt, tableId: selected, attended: false, canceled: false, source: "manual" }];
    persist(next);
    setNewName("");
    setNewCount(1);
    setToast({ type: "success", msg: `تمت إضافة ${newName.trim()}` });
  }

  function removeGuest(id) {
    persist(guests.filter((g) => g.id !== id));
  }

  function updateCount(id, delta) {
    const g = guests.find((x) => x.id === id);
    if (!g) return;
    const newC = Math.max(0, g.count + delta);
    if (newC === 0) { removeGuest(id); return; }
    updateGuest(id, { count: newC });
  }

  function toggleAttended(id) {
    const g = guests.find((x) => x.id === id);
    if (!g || g.canceled) return;
    updateGuest(id, { attended: !g.attended });
    setToast({ type: "success", msg: !g.attended ? `✓ ${g.name} وصل` : `تم إلغاء تسجيل وصول ${g.name}` });
  }

  function toggleCanceled(id) {
    const g = guests.find((x) => x.id === id);
    if (!g) return;
    updateGuest(id, { canceled: !g.canceled, attended: g.canceled ? g.attended : false });
    setToast({ type: g.canceled ? "success" : "error", msg: g.canceled ? `تم إلغاء الاعتذار عن ${g.name}` : `✕ ${g.name} اعتذر عن الحضور` });
  }

  // ---- Assign a guest to a table, with capacity-conflict confirmation ----
  function requestAssign(guestId, tableId) {
    if (!tableId) return;
    const guest = guests.find((g) => g.id === guestId);
    const table = TABLE_DEFS.find((t) => t.id === Number(tableId));
    if (!guest || !table) return;
    const currentUsed = tableUsage[table.id]?.used || 0;
    const overBy = currentUsed + guest.count - table.cap;
    if (overBy > 0) {
      setPendingAssign({ guestId, tableId: table.id, overBy, guestName: guest.name, tableName: table.id });
    } else {
      assignGuest(guestId, table.id);
    }
  }

  function assignGuest(guestId, tableId) {
    const guest = guests.find((g) => g.id === guestId);
    updateGuest(guestId, { tableId });
    setToast({ type: "success", msg: `تم إجلاس ${guest?.name} على طاولة ${tableId}` });
    setPendingAssign(null);
  }

  function unseatGuest(id) {
    updateGuest(id, { tableId: null });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF6F0]">
        <div className="flex flex-col items-center gap-3 text-[#7A2E3A]">
          <RefreshCw className="animate-spin" size={28} />
          <p className="font-medium">جاري تحميل بيانات الطاولات…</p>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAF6F0] text-[#2B2320]" style={{ fontFamily: "'Tajawal','Segoe UI',sans-serif" }}>
      {/* ---------- Header ---------- */}
      <header className="sticky top-0 z-30 bg-[#7A2E3A] text-[#FAF6F0] shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-wide" style={{ fontFamily: "'Amiri', serif" }}>
              بيت الورد — لوحة الجلوس والحضور الحية
            </h1>
            <p className="text-xs text-[#E8C9B8] opacity-90">Beit Al Ward · Live Seating & Check-in</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuestList(true)}
              className="flex items-center gap-1.5 bg-[#B8935F] text-white text-sm rounded-full px-3 py-1.5 hover:bg-[#A5824F]"
            >
              <List size={14} /> قائمة كل المعازيم
            </button>
            <select
              value={collaborator}
              onChange={(e) => setCollaborator(e.target.value)}
              className="bg-[#8F3B49] text-white text-sm rounded-full px-3 py-1.5 border border-[#B8935F] outline-none"
            >
              {COLLABORATORS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {!connected && <span className="text-xs text-[#E8C9B8] flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> يتصل…</span>}
          </div>
        </div>
      </header>

      {/* ---------- Stats bar ---------- */}
      <div className="max-w-7xl mx-auto px-4 mt-4 grid grid-cols-2 md:grid-cols-7 gap-3">
        <StatCard label="جلسوا" value={`${stats.seated} / ${stats.capacity}`} icon={<Users size={18} />} accent="#7A2E3A" />
        <StatCard label="لم يجلسوا بعد" value={stats.unseated} icon={<ArrowRightLeft size={18} />} accent={stats.unseated ? "#B8935F" : "#6B7F6B"} />
        <StatCard label="حضروا فعلياً" value={`${stats.attended} / ${stats.seated}`} icon={<UserCheck size={18} />} accent="#2F7A4F" />
        <StatCard label="اعتذروا" value={stats.canceled} icon={<XCircle size={18} />} accent={stats.canceled ? "#C1443D" : "#6B7F6B"} />
        <StatCard label="تكرار أسماء" value={stats.duplicates.length} icon={<AlertTriangle size={18} />} accent={stats.duplicates.length ? "#C1443D" : "#6B7F6B"} />
        <StatCard label="طاولات شبه ممتلئة" value={almostFull.length} icon={<AlertTriangle size={18} />} accent={almostFull.length ? "#B8935F" : "#6B7F6B"} />
        <StatCard label="طاولات فوق السعة" value={overCapacity.length} icon={<AlertTriangle size={18} />} accent={overCapacity.length ? "#C1443D" : "#6B7F6B"} />
      </div>

      {/* ---------- Alerts ---------- */}
      {(stats.duplicates.length > 0 || almostFull.length > 0 || overCapacity.length > 0 || stats.unseated > 0) && (
        <div className="max-w-7xl mx-auto px-4 mt-3 space-y-2">
          {stats.unseated > 0 && (
            <div className="flex items-center gap-2 bg-[#EFEAE0] border border-[#DCCFB8] text-[#6B5629] text-sm rounded-lg px-3 py-2">
              <ArrowRightLeft size={16} />
              <span>{stats.unseated} ضيف لم يتم إجلاسهم بعد — افتح "قائمة كل المعازيم" لتوزيعهم</span>
            </div>
          )}
          {stats.duplicates.map(([name, tids]) => (
            <div key={name} className="flex items-center gap-2 bg-[#FBE7E5] border border-[#E8B3AE] text-[#8A2B24] text-sm rounded-lg px-3 py-2">
              <AlertTriangle size={16} />
              <span><b>{name}</b> مكرر في الطاولات: {tids.join("، ")}</span>
            </div>
          ))}
          {overCapacity.map((t) => {
            const used = tableUsage[t.id]?.used || 0;
            const over = used - t.cap;
            return (
              <div key={`over-${t.id}`} className="flex items-center gap-2 bg-[#FBE7E5] border border-[#E8B3AE] text-[#8A2B24] text-sm rounded-lg px-3 py-2">
                <AlertTriangle size={16} />
                <span>طاولة {t.id} فوق السعة بـ {over} {over === 1 ? "مقعد" : "مقاعد"} ({used}/{t.cap})</span>
              </div>
            );
          })}
          {almostFull.map((t) => {
            const used = tableUsage[t.id]?.used || 0;
            const remaining = t.cap - used;
            return (
              <div key={t.id} className="flex items-center gap-2 bg-[#FBF2E2] border border-[#E9D4A8] text-[#7A5A1E] text-sm rounded-lg px-3 py-2">
                <AlertTriangle size={16} />
                <span>طاولة {t.id} تحتاج {remaining} {remaining === 1 ? "شخص" : "أشخاص"} فقط لتكتمل ({used}/{t.cap})</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------- Search ---------- */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <div className="relative max-w-md">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8A78]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن اسم ضيف…"
            className="w-full bg-white border border-[#E4D9C8] rounded-full py-2 pr-9 pl-4 text-sm outline-none focus:border-[#B8935F]"
          />
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 bg-white border border-[#E4D9C8] rounded-lg shadow-sm max-w-md overflow-hidden">
            {searchResults.map((g) => (
              <button
                key={g.id}
                onClick={() => { if (g.tableId) setSelected(g.tableId); else setShowGuestList(true); setSearch(""); }}
                className="w-full text-right px-4 py-2 text-sm hover:bg-[#FAF0E6] flex justify-between border-b last:border-b-0 border-[#F0E8DA]"
              >
                <span className={g.canceled ? "line-through text-[#9A8A78]" : ""}>{g.name}</span>
                <span className="text-[#B8935F] font-medium">{g.canceled ? "اعتذر" : g.tableId ? `طاولة ${g.tableId}` : "لم يجلس"}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------- Floor plan ---------- */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="relative bg-white rounded-2xl border border-[#E4D9C8] shadow-sm mx-auto overflow-hidden" style={{ maxWidth: 980, aspectRatio: "1.35" }}>
          {/* Architectural line drawing: room walls, three concentric rings, corridor, screen, stage, entrance */}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
            {/* room walls */}
            <rect x="3" y="4" width="94" height="90" fill="none" stroke="#E4D9C8" strokeWidth="0.5" />
            {/* floral top border, simple repeated marks */}
            {Array.from({ length: 18 }).map((_, i) => (
              <text key={i} x={6 + i * 5.2} y="8.5" fontSize="3.2" fill="#E8C9B8" textAnchor="middle">✻</text>
            ))}
            {/* three concentric rings */}
            <circle cx="50" cy="50" r="9" fill="#FAF6F0" stroke="#E8C9B8" strokeWidth="0.6" />
            <circle cx="50" cy="50" r="20" fill="none" stroke="#E4D9C8" strokeWidth="0.4" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="#E4D9C8" strokeWidth="0.4" />
            {/* horizontal corridor to screen (west) and stage (east) */}
            <rect x="10" y="46" width="17" height="8" fill="#F7F1E8" stroke="#E4D9C8" strokeWidth="0.3" />
            <rect x="73" y="46" width="17" height="8" fill="#F7F1E8" stroke="#E4D9C8" strokeWidth="0.3" />
            {/* vertical corridor, top wall to circle and circle to entrance */}
            <rect x="47" y="8" width="6" height="33" fill="#F7F1E8" stroke="#E4D9C8" strokeWidth="0.3" />
            <rect x="47" y="59" width="6" height="33" fill="#F7F1E8" stroke="#E4D9C8" strokeWidth="0.3" />
            {/* screen box, west wall */}
            <rect x="4" y="44" width="4" height="12" fill="none" stroke="#B8935F" strokeWidth="0.5" />
            {/* stage pillars (steps), east wall */}
            <circle cx="94" cy="47" r="1.6" fill="#F0D3E1" stroke="#C0678C" strokeWidth="0.4" />
            <circle cx="94" cy="53" r="1.6" fill="#F0D3E1" stroke="#C0678C" strokeWidth="0.4" />
            <path d="M 90 45 Q 96 50 90 55" fill="none" stroke="#C0678C" strokeWidth="0.4" />
            {/* entrance gap, south wall, between 17 and 18 */}
            <line x1="3" y1="94" x2="42" y2="94" stroke="#E4D9C8" strokeWidth="0.5" />
            <line x1="58" y1="94" x2="97" y2="94" stroke="#E4D9C8" strokeWidth="0.5" />
            <text x="50" y="97.5" fontSize="2.6" fill="#B8935F" textAnchor="middle">المدخل</text>
          </svg>

          <div className="absolute pointer-events-none" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "16%", aspectRatio: "1" }}>
            <div className="w-full h-full rounded-full flex items-center justify-center">
              <span className="text-[#B8935F] font-semibold text-[10px] text-center" style={{ fontFamily: "'Amiri', serif" }}>بيت<br/>الورد</span>
            </div>
          </div>

          {TABLE_DEFS.map((t) => {
            const used = tableUsage[t.id]?.used || 0;
            const att = tableUsage[t.id]?.attended || 0;
            const pct = t.cap ? used / t.cap : 0;
            const isFull = used >= t.cap && used > 0;
            const isOver = used > t.cap;
            const style = shapeStyle(t.shape);
            let fillColor = "#D9CFC0";
            if (t.bride) fillColor = isOver ? "#A83D3D" : isFull ? "#C0678C" : pct > 0 ? "#E3A8C4" : "#F0D3E1";
            else if (isOver) fillColor = "#A83D3D";
            else if (isFull) fillColor = "#2F7A4F";
            else if (pct > 0) fillColor = "#B8935F";

            const allAttended = used > 0 && att >= used;

            return (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                title={t.bride ? `طاولة ${t.id} — طرف العروس` : `طاولة ${t.id}`}
                className="absolute flex flex-col items-center justify-center text-[10px] font-bold text-white shadow transition-transform hover:scale-110 cursor-pointer"
                style={{
                  left: `${t.x}%`,
                  top: `${t.y}%`,
                  transform: "translate(-50%,-50%)",
                  background: fillColor,
                  border: selected === t.id ? "2px solid #2B2320" : isFull && !t.bride ? "2px solid #1F5A38" : t.bride ? "1px solid #C0678C" : "1px solid rgba(0,0,0,0.15)",
                  ...style,
                }}
              >
                {allAttended && (
                  <span className="absolute -top-1.5 -right-1.5 bg-white rounded-full p-0.5 shadow" style={{ color: t.bride ? "#C0678C" : "#2F7A4F" }}>
                    <Check size={9} strokeWidth={3.5} />
                  </span>
                )}
                <span>{t.id}</span>
                <span className="text-[8px] font-normal opacity-90">{used}/{t.cap}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 justify-center mt-4 text-xs text-[#6B5F52]">
          <Legend color="#D9CFC0" label="فارغة" />
          <Legend color="#B8935F" label="جزئية" />
          <Legend color="#2F7A4F" label="ممتلئة بالكامل" />
          <Legend color="#A83D3D" label="فوق السعة" />
          <Legend color="#F0D3E1" label="طرف العروس (متاحة)" />
          <span className="flex items-center gap-1.5">
            <span className="bg-white rounded-full p-0.5 shadow inline-flex" style={{ color: "#2F7A4F" }}><Check size={9} strokeWidth={3.5} /></span>
            الجميع حضر
          </span>
        </div>
      </main>

      {/* ---------- Table side drawer ---------- */}
      {selectedTable && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelected(null)} />
          <div dir="rtl" className="relative w-full max-w-sm bg-[#FAF6F0] h-full shadow-2xl overflow-y-auto">
            <div className="sticky top-0 px-5 py-4" style={{ background: selectedTable.bride ? "#C0678C" : "#7A2E3A", color: "white" }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  طاولة {selectedTable.id}
                  {selectedTable.bride && <span className="text-xs font-normal opacity-90 mr-2">(طرف العروس)</span>}
                </h2>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-full hover:bg-white/10">
                  <X size={20} />
                </button>
              </div>
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-xs opacity-90">
                  <span>{selectedUsed} / {selectedTable.cap} مقعد ({selectedTable.cap ? Math.round((selectedUsed / selectedTable.cap) * 100) : 0}%)</span>
                  <span>متبقي: {Math.max(0, selectedTable.cap - selectedUsed)}</span>
                </div>
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white/70" style={{ width: `${Math.min(100, (selectedUsed / selectedTable.cap) * 100)}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs opacity-90 pt-1">
                  <span className="flex items-center gap-1"><UserCheck size={12} /> حضروا: {selectedAttended} / {selectedUsed}</span>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-2">
              {selectedGuests.length === 0 && (
                <p className="text-sm text-[#9A8A78] text-center py-6">لا يوجد ضيوف بعد في هذه الطاولة</p>
              )}
              {selectedGuests.map((g) => {
                const isDupe = stats.duplicates.some(([n]) => n === g.name.trim());
                const rowBorderColor = g.canceled ? "#EFE6D8" : isDupe ? "#E8B3AE" : g.attended ? "#BEE0CB" : "#EFE6D8";
                const checkBg = g.canceled ? "#F0E8DA" : g.attended ? "#2F7A4F" : "#FFFFFF";
                const checkBorder = g.canceled ? "#E4D9C8" : g.attended ? "#2F7A4F" : "#D9CFC0";
                const checkIconColor = g.canceled ? "transparent" : g.attended ? "#FFFFFF" : "transparent";
                return (
                  <div key={g.id} className={`flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border ${g.canceled ? "opacity-60" : ""}`} style={{ borderColor: rowBorderColor }}>
                    <button
                      onClick={() => toggleAttended(g.id)}
                      disabled={g.canceled}
                      title={g.attended ? "تم الوصول — اضغط للإلغاء" : "لم يصل بعد — اضغط لتسجيل الوصول"}
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${g.canceled ? "cursor-not-allowed" : ""}`}
                      style={{ background: checkBg, borderColor: checkBorder, color: checkIconColor }}
                    >
                      <Check size={14} strokeWidth={3} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate flex items-center gap-1.5 ${g.canceled ? "line-through text-[#9A8A78]" : ""}`} style={g.attended && !g.canceled ? { color: "#2F7A4F" } : undefined}>
                        {g.name}
                        {isDupe && <AlertTriangle size={13} className="text-[#C1443D] shrink-0" />}
                        {g.canceled && <span className="text-[10px] text-[#C1443D] font-normal shrink-0">(اعتذر)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => updateCount(g.id, -1)} className="w-6 h-6 rounded-full bg-[#F0E8DA] text-[#7A2E3A] text-sm font-bold flex items-center justify-center hover:bg-[#E4D9C8]">−</button>
                      <span className="w-5 text-center text-sm font-semibold">{g.count}</span>
                      <button onClick={() => updateCount(g.id, 1)} className="w-6 h-6 rounded-full bg-[#F0E8DA] text-[#7A2E3A] text-sm font-bold flex items-center justify-center hover:bg-[#E4D9C8]">+</button>
                      <button
                        onClick={() => toggleCanceled(g.id)}
                        title={g.canceled ? "التراجع عن الاعتذار" : "وضع علامة اعتذار (لن يحضر)"}
                        className={`w-6 h-6 rounded-full flex items-center justify-center ${g.canceled ? "bg-[#EFE6D8] text-[#7A5A1E]" : "bg-[#FBE7E5] text-[#C1443D] hover:bg-[#F5D4D0]"}`}
                      >
                        {g.canceled ? <Undo2 size={12} /> : <X size={12} strokeWidth={3} />}
                      </button>
                      {!g.canceled && (
                        <select
                          onChange={(e) => { if (e.target.value) requestAssign(g.id, Number(e.target.value)); e.target.value = ""; }}
                          defaultValue=""
                          className="text-[10px] bg-[#F0E8DA] rounded px-1 py-1 outline-none border-none max-w-[48px]"
                          title="نقل إلى طاولة أخرى"
                        >
                          <option value="">نقل</option>
                          {TABLE_DEFS.filter((tt) => tt.id !== selectedTable.id).map((tt) => (
                            <option key={tt.id} value={tt.id}>طاولة {tt.id}</option>
                          ))}
                        </select>
                      )}
                      <button onClick={() => removeGuest(g.id)} className="w-6 h-6 rounded-full bg-[#FBE7E5] text-[#C1443D] flex items-center justify-center hover:bg-[#F5D4D0]">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-5 pt-0 border-t border-[#EFE6D8] mt-2">
              <p className="text-xs font-semibold text-[#7A2E3A] mb-2 mt-4">إضافة ضيف جديد مباشرة</p>
              <div className="flex items-center gap-2">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="اسم الضيف"
                  className="flex-1 bg-white border border-[#E4D9C8] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#B8935F]"
                  onKeyDown={(e) => { if (e.key === "Enter") addNewGuestToTable(); }}
                />
                <input
                  type="number"
                  min={1}
                  value={newCount}
                  onChange={(e) => setNewCount(e.target.value)}
                  className="w-16 bg-white border border-[#E4D9C8] rounded-lg px-2 py-2 text-sm outline-none focus:border-[#B8935F]"
                />
                <button onClick={addNewGuestToTable} className="bg-[#7A2E3A] text-white rounded-lg p-2.5 hover:bg-[#8F3B49]">
                  <Plus size={16} />
                </button>
              </div>
              <p className="text-[11px] text-[#9A8A78] mt-2">
                لإضافة ضيف من القائمة الأصلية بدل ضيف جديد، استخدم "قائمة كل المعازيم".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Master guest list modal ---------- */}
      {showGuestList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowGuestList(false)} />
          <div dir="rtl" className="relative bg-[#FAF6F0] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="bg-[#7A2E3A] text-white px-5 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2"><List size={18} /> قائمة كل المعازيم ({guests.length})</h2>
              <button onClick={() => setShowGuestList(false)} className="p-1.5 rounded-full hover:bg-white/10">
                <X size={20} />
              </button>
            </div>

            <div className="px-5 pt-4 pb-2 shrink-0 space-y-3">
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9A8A78]" />
                <input
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="ابحث في القائمة الكاملة…"
                  className="w-full bg-white border border-[#E4D9C8] rounded-full py-2 pr-9 pl-4 text-sm outline-none focus:border-[#B8935F]"
                />
              </div>
              <div className="flex gap-2 flex-wrap text-xs">
                <FilterPill label={`الكل (${guests.length})`} active={listFilter === "all"} onClick={() => setListFilter("all")} />
                <FilterPill label={`جلسوا (${guests.filter(g => g.tableId && !g.canceled).length})`} active={listFilter === "seated"} onClick={() => setListFilter("seated")} accent="#7A2E3A" />
                <FilterPill label={`لم يجلسوا (${guests.filter(g => !g.tableId && !g.canceled).length})`} active={listFilter === "unseated"} onClick={() => setListFilter("unseated")} accent="#B8935F" />
                <FilterPill label={`حضروا (${guests.filter(g => g.attended && !g.canceled).length})`} active={listFilter === "attended"} onClick={() => setListFilter("attended")} accent="#2F7A4F" />
                <FilterPill label={`اعتذروا (${guests.filter(g => g.canceled).length})`} active={listFilter === "canceled"} onClick={() => setListFilter("canceled")} accent="#C1443D" />
              </div>
              {pendingAssign && (
                <div className="bg-[#FBF2E2] border border-[#E9D4A8] rounded-lg px-3 py-2 text-xs text-[#7A5A1E] flex items-center justify-between gap-2">
                  <span>تحذير: هذا سيتجاوز سعة طاولة {pendingAssign.tableId} بـ {pendingAssign.overBy} مقعد. إضافة {pendingAssign.guestName} على أي حال؟</span>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => assignGuest(pendingAssign.guestId, pendingAssign.tableId)} className="bg-[#B8935F] text-white rounded-full px-2.5 py-1">نعم</button>
                    <button onClick={() => setPendingAssign(null)} className="bg-white border border-[#E4D9C8] rounded-full px-2.5 py-1">إلغاء</button>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-y-auto px-5 pb-5 flex-1 space-y-1.5">
              {filteredGuests.length === 0 && (
                <p className="text-sm text-[#9A8A78] text-center py-10">لا يوجد ضيوف مطابقين</p>
              )}
              {filteredGuests.map((g) => {
                const rowBorderColor = g.canceled ? "#EFE6D8" : g.attended ? "#BEE0CB" : !g.tableId ? "#E9D4A8" : "#EFE6D8";
                const checkDisabled = g.canceled || !g.tableId;
                const checkBg = checkDisabled ? "#F0E8DA" : g.attended ? "#2F7A4F" : "#FFFFFF";
                const checkBorder = checkDisabled ? "#E4D9C8" : g.attended ? "#2F7A4F" : "#D9CFC0";
                const checkIconColor = checkDisabled ? "transparent" : g.attended ? "#FFFFFF" : "transparent";
                return (
                <div
                  key={g.id}
                  className={`flex items-center justify-between gap-2 bg-white rounded-lg px-3 py-2 border ${g.canceled ? "opacity-60" : ""}`}
                  style={{ borderColor: rowBorderColor }}
                >
                  <button
                    onClick={() => toggleAttended(g.id)}
                    disabled={checkDisabled}
                    title={!g.tableId ? "يجب إجلاسه أولاً" : g.attended ? "تم الوصول" : "لم يصل بعد"}
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${checkDisabled ? "cursor-not-allowed" : ""}`}
                    style={{ background: checkBg, borderColor: checkBorder, color: checkIconColor }}
                  >
                    <Check size={12} strokeWidth={3} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${g.canceled ? "line-through text-[#9A8A78]" : ""}`} style={g.attended && !g.canceled ? { color: "#2F7A4F" } : undefined}>
                      {g.name} <span className="text-[#9A8A78] font-normal">×{g.count}</span>
                    </p>
                    <p className="text-[10px] text-[#B8935F]">{SOURCE_LABELS[g.source] || g.source}</p>
                  </div>

                  {g.tableId ? (
                    <span className="text-[10px] bg-[#F0E8DA] text-[#7A2E3A] rounded-full px-2 py-1 shrink-0 flex items-center gap-1">
                      طاولة {g.tableId}
                      {!g.canceled && (
                        <button onClick={() => unseatGuest(g.id)} title="إزالة من الطاولة" className="text-[#C1443D]"><X size={10} strokeWidth={3} /></button>
                      )}
                    </span>
                  ) : !g.canceled ? (
                    <select
                      onChange={(e) => { if (e.target.value) requestAssign(g.id, Number(e.target.value)); e.target.value = ""; }}
                      defaultValue=""
                      className="text-[10px] bg-[#EFEAE0] text-[#6B5629] rounded-full px-2 py-1.5 outline-none border-none shrink-0"
                    >
                      <option value="">إجلاس في…</option>
                      {TABLE_DEFS.map((tt) => (
                        <option key={tt.id} value={tt.id}>طاولة {tt.id} ({tableUsage[tt.id]?.used || 0}/{tt.cap})</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[10px] text-[#C1443D] shrink-0">اعتذر</span>
                  )}

                  <button
                    onClick={() => toggleCanceled(g.id)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${g.canceled ? "bg-[#EFE6D8] text-[#7A5A1E]" : "bg-[#FBE7E5] text-[#C1443D] hover:bg-[#F5D4D0]"}`}
                  >
                    {g.canceled ? <Undo2 size={12} /> : <X size={12} strokeWidth={3} />}
                  </button>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ---------- Toast ---------- */}
      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm text-white shadow-lg ${toast.type === "error" ? "bg-[#C1443D]" : "bg-[#2F7A4F]"}`}>
          {toast.msg}
        </div>
      )}

      <footer className="text-center text-xs text-[#9A8A78] py-6">
        عرس حرب · بيت الورد · تم إنشاؤه بواسطة Claude
      </footer>
    </div>
  );
}

function StatCard({ label, value, icon, accent }) {
  return (
    <div className="bg-white rounded-xl border border-[#E4D9C8] px-3 py-3 flex items-center gap-2.5">
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${accent}1A`, color: accent }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-[#9A8A78] truncate">{label}</p>
        <p className="text-base font-bold truncate" style={{ color: accent }}>{value}</p>
      </div>
    </div>
  );
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-full inline-block" style={{ background: color }} />
      {label}
    </div>
  );
}

function FilterPill({ label, active, onClick, accent = "#7A2E3A" }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full border font-medium transition-colors"
      style={active ? { background: accent, color: "white", borderColor: accent } : { background: "white", color: accent, borderColor: "#E4D9C8" }}
    >
      {label}
    </button>
  );
}
