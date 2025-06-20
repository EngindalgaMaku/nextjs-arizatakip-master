// Rastgele arıza kayıtları oluşturmak için script
const { createClient } = require('@supabase/supabase-js');

// Supabase bağlantı bilgileri
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://gcxbfmqyvqchcrudxpmh.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjeGJmbXF5dnFjaGNydWR4cG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNzQ5NTcsImV4cCI6MjA2MDc1MDk1N30.ZVAsgNkAWqtSpEgUufOdvegyXVeN5H6fXYA7rn-8osQ";

// Supabase client oluştur
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Rastgele veriler
const turkishTeacherNames = [
  "Ayşe Yılmaz", "Mehmet Demir", "Fatma Öztürk", "Ahmet Kaya", "Zeynep Çelik",
  "Ali Şahin", "Elif Yıldız", "Mustafa Arslan", "Hatice Güneş", "Hüseyin Aydın",
  "Sevgi Kılıç", "Ömer Doğan", "Bahar Koç", "Kemal Ateş", "Esra Yalçın",
  "Osman Özdemir", "Gül Aksoy", "İbrahim Çetin", "Zehra Aslan", "Serkan Erdoğan"
];

const deviceTypes = ["akilli_tahta", "bilgisayar", "yazici", "projektor", "diger"];
const deviceLocations = ["sinif", "laboratuvar", "idare", "ogretmenler_odasi", "diger"];
const statuses = ["beklemede", "atandi", "inceleniyor", "cozuldu", "kapatildi"];
const priorities = ["dusuk", "normal", "yuksek", "kritik"];

const deviceNames = {
  akilli_tahta: ["Samsung Flipchart", "Vestel Akıllı Tahta", "Smart Board", "Interactive LCD Panel", "Promethean ActivPanel"],
  bilgisayar: ["HP Pavilion", "Dell Optiplex", "Lenovo ThinkCentre", "Asus ROG", "Casper Nirvana"],
  yazici: ["HP LaserJet", "Canon Pixma", "Epson EcoTank", "Brother DCP", "Samsung Xpress"],
  projektor: ["Epson EB-X51", "BenQ MS535A", "Acer X118H", "ViewSonic PA503X", "Casio XJ-V2"],
  diger: ["Kulaklık Seti", "Tarayıcı", "Hoparlör", "Modem", "UPS"]
};

const issueDescriptions = [
  "Cihaz açılmıyor, güç sorunu olabilir.",
  "Ekranda görüntü yok, ancak cihaz açılıyor.",
  "Dokunmatik ekran tepki vermiyor.",
  "Ses çıkışı yok, hoparlör sorunu olabilir.",
  "Bağlantı kablosu hasarlı görünüyor.",
  "İnternet bağlantısı çok yavaş çalışıyor.",
  "Klavyede bazı tuşlar çalışmıyor.",
  "Ekranda renkler doğru görünmüyor.",
  "Yazıcı kağıt sıkıştırıyor.",
  "Toner bitmek üzere, değiştirilmesi gerekiyor.",
  "Bluetooth bağlantısı kurulamıyor.",
  "Mikrofon çalışmıyor, ses kaydı yapılamıyor.",
  "Sistem çok yavaş açılıyor ve tepki vermiyor.",
  "Cihaz aşırı ısınıyor ve kendini kapatıyor.",
  "USB portları tanınmıyor.",
  "Güç adaptörü çalışmıyor, şarj olmuyor.",
  "Projeksiyon cihazı bulanık görüntü veriyor.",
  "Ekranda dikey çizgiler var.",
  "Fare/touchpad tepki vermiyor.",
  "Yazılım lisans sorunu yaşanıyor."
];

const roomNumbers = ["101", "102", "103", "104", "105", "201", "202", "203", "204", "205", "301", "302", "303", "304", "305", "Müdür Odası", "Rehberlik Odası", "Öğretmenler Odası", "Laboratuvar-1", "Laboratuvar-2"];

const notes = [
  "Cihazın garantisi hala devam ediyor, servis çağırılabilir.",
  "Benzer sorun daha önce de yaşanmıştı.",
  "Yedek parça sipariş edilmesi gerekebilir.",
  "Onarım için teknik servise gönderildi.",
  "Geçici çözüm uygulandı, kalıcı çözüm için yedek parça bekleniyor.",
  "Cihaz çok eski, yenisiyle değiştirilmesi daha uygun olabilir.",
  "Kullanıcı hatası kaynaklı olabilir, eğitim verilmeli.",
  "Yazılım güncellemesi gerekiyor.",
  "Uzaktan destek ile çözülebilir bir sorun.",
  "Aynı sorun birden fazla cihazda görülüyor, sistematik bir problem olabilir.",
  null, null, null, null, null
];

// Rastgele tarih oluşturma fonksiyonu (son 30 gün içinde)
function getRandomDate() {
  const now = new Date();
  const pastDate = new Date(now.getTime() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
  return pastDate.toISOString();
}

// Rastgele arıza kaydı oluşturma fonksiyonu
function generateRandomIssue() {
  const deviceType = deviceTypes[Math.floor(Math.random() * deviceTypes.length)];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const createdAt = getRandomDate();
  
  // Eğer status "cozuldu" ise resolved_at ekle, değilse null
  let resolvedAt = null;
  if (status === "cozuldu" || status === "kapatildi") {
    // created_at'dan sonraki bir tarih olsun
    const createdDate = new Date(createdAt);
    const resolveDate = new Date(createdDate.getTime() + Math.floor(Math.random() * 5) * 24 * 60 * 60 * 1000);
    resolvedAt = resolveDate.toISOString();
  }

  // Eğer status "atandi" veya "inceleniyor" ise assigned_to ekle
  let assignedTo = null;
  if (status === "atandi" || status === "inceleniyor" || status === "cozuldu") {
    assignedTo = "Admin";
  }

  return {
    device_type: deviceType,
    device_name: deviceNames[deviceType][Math.floor(Math.random() * deviceNames[deviceType].length)],
    device_location: deviceLocations[Math.floor(Math.random() * deviceLocations.length)],
    room_number: roomNumbers[Math.floor(Math.random() * roomNumbers.length)],
    reported_by: turkishTeacherNames[Math.floor(Math.random() * turkishTeacherNames.length)],
    assigned_to: assignedTo,
    description: issueDescriptions[Math.floor(Math.random() * issueDescriptions.length)],
    status: status,
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    notes: notes[Math.floor(Math.random() * notes.length)],
    created_at: createdAt,
    updated_at: status !== "beklemede" ? createdAt : null,
    resolved_at: resolvedAt
  };
}

// Ana fonksiyon
async function main() {
  try {
    console.log("Mevcut arıza kayıtları siliniyor...");
    
    // Önce tüm kayıtların ID'lerini alalım
    const { data: existingIssues, error: fetchError } = await supabase
      .from('issues')
      .select('id');
    
    if (fetchError) {
      console.error("Mevcut kayıtlar alınırken hata oluştu:", fetchError);
      return;
    }
    
    console.log(`${existingIssues.length} adet mevcut kayıt bulundu.`);
    
    if (existingIssues.length > 0) {
      // Mevcut kayıtları silme
      // NOT: Kayıtları WHERE id in (..) ile tek seferde silebilirdik 
      // ancak çok fazla ID olması durumunda sorun yaşanabileceği için
      // her kaydı tek tek siliyoruz
      for (const issue of existingIssues) {
        const { error: deleteError } = await supabase
          .from('issues')
          .delete()
          .eq('id', issue.id);
        
        if (deleteError) {
          console.error(`ID: ${issue.id} silinirken hata oluştu:`, deleteError);
        }
      }
      
      console.log("Tüm kayıtlar silindi.");
    }
    
    console.log("Yeni rastgele kayıtlar oluşturuluyor...");
    
    // 30 adet rastgele kayıt oluştur
    const randomIssues = Array.from({ length: 30 }, generateRandomIssue);
    
    // Veritabanına ekle
    const { data, error } = await supabase
      .from('issues')
      .insert(randomIssues)
      .select();
    
    if (error) {
      console.error("Kayıtlar eklenirken hata oluştu:", error);
      return;
    }
    
    console.log(`${data.length} adet rastgele arıza kaydı başarıyla oluşturuldu.`);
    
  } catch (error) {
    console.error("İşlem sırasında hata oluştu:", error);
  }
}

// Scripti çalıştır
main(); 