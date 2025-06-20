import { Test } from '@/types/tests';

export const TESTS: Test[] = [
  {
    id: '1',
    title: 'Bölüm 7: Uygulama Katmanı Testi',
    slug: 'osi-application-layer',
    description: 'OSI modelinin 7. katmanı olan Uygulama Katmanı hakkında 50 soruluk çoktan seçmeli test.',
    category: 'Ağ Temelleri',
    questions: [
      {
        id: "1",
        text: 'OSI modelinde Uygulama Katmanı hangi katmandır?',
        options: [
          { id: 'a', text: '5. katman' },
          { id: 'b', text: '7. katman' },
          { id: 'c', text: '3. katman' },
          { id: 'd', text: '1. katman' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "2",
        text: 'Aşağıdakilerden hangisi Uygulama Katmanı\'nın temel görevlerinden biridir?',
        options: [
          { id: 'a', text: 'Veri şifreleme' },
          { id: 'b', text: 'Hata düzeltme' },
          { id: 'c', text: 'Fiziksel iletim' },
          { id: 'd', text: 'Ağ adresi atama' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "3",
        text: 'DNS\'in temel amacı nedir?',
        options: [
          { id: 'a', text: 'E-posta göndermek' },
          { id: 'b', text: 'Web sayfalarını görüntülemek' },
          { id: 'c', text: 'Host isimlerini IP adreslerine çevirmek' },
          { id: 'd', text: 'Dosya transferi yapmak' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "4",
        text: 'DNS\'de kullanılan "A" kayıt türü neyi ifade eder?',
        options: [
          { id: 'a', text: 'Mail sunucusu' },
          { id: 'b', text: 'İsim sunucusu' },
          { id: 'c', text: 'Host adresi' },
          { id: 'd', text: 'Takma isim' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "5",
        text: 'DNS isim uzayı nasıl bir yapıya sahiptir?',
        options: [
          { id: 'a', text: 'Düz' },
          { id: 'b', text: 'Rastgele' },
          { id: 'c', text: 'Hiyerarşik' },
          { id: 'd', text: 'Matris' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "6",
        text: 'DNS, host isimlerini en fazla kaç karaktere kadar çevirebilir?',
        options: [
          { id: 'a', text: '128' },
          { id: 'b', text: '256' },
          { id: 'c', text: '512' },
          { id: 'd', text: '1024' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "7",
        text: 'Aşağıdakilerden hangisi DNS\'in bir parçası değildir?',
        options: [
          { id: 'a', text: 'İsim sunucuları' },
          { id: 'b', text: 'Çözümleyiciler' },
          { id: 'c', text: 'Web tarayıcıları' },
          { id: 'd', text: 'DNS istemcileri' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "8",
        text: 'DNS\'de "CNAME" kaydı ne için kullanılır?',
        options: [
          { id: 'a', text: 'Mail alışverişi' },
          { id: 'b', text: 'Yetkili isim sunucu' },
          { id: 'c', text: 'Takma isim' },
          { id: 'd', text: 'Host bilgisi' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "9",
        text: 'Elektronik postanın temel avantajı nedir?',
        options: [
          { id: 'a', text: 'Yüksek güvenlik' },
          { id: 'b', text: 'Resmi işlemlerde yaygın kullanım' },
          { id: 'c', text: 'Ucuzluk ve kolaylık' },
          { id: 'd', text: 'Hızlı teslimat garantisi' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "10",
        text: 'Aşağıdakilerden hangisi bir e-posta servisidir?',
        options: [
          { id: 'a', text: 'Dosya sıkıştırma' },
          { id: 'b', text: 'Mesaj transferi' },
          { id: 'c', text: 'Ağ yönlendirme' },
          { id: 'd', text: 'Veritabanı yönetimi' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "11",
        text: 'RFC 822\'de "Cc" başlık alanı neyi ifade eder?',
        options: [
          { id: 'a', text: 'Birincil alıcı' },
          { id: 'b', text: 'İkincil alıcı' },
          { id: 'c', text: 'Gizli alıcı' },
          { id: 'd', text: 'Gönderen' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "12",
        text: 'MIME\'in temel amacı nedir?',
        options: [
          { id: 'a', text: 'Metin tabanlı e-posta göndermek' },
          { id: 'b', text: 'E-postalara farklı içerik türleri eklemek' },
          { id: 'c', text: 'E-posta güvenliğini sağlamak' },
          { id: 'd', text: 'E-posta adreslerini yönetmek' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "13",
        text: 'E-posta mesajları hangi protokol ile transfer edilir?',
        options: [
          { id: 'a', text: 'HTTP' },
          { id: 'b', text: 'FTP' },
          { id: 'c', text: 'SMTP' },
          { id: 'd', text: 'TCP' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "14",
        text: 'POP3 ve IMAP arasındaki temel fark nedir?',
        options: [
          { id: 'a', text: 'POP3 mesajları sunucuda saklar, IMAP istemciye indirir' },
          { id: 'b', text: 'POP3 mesajları istemciye indirir, IMAP sunucuda saklar' },
          { id: 'c', text: 'POP3 ve IMAP aynı işlevi görür' },
          { id: 'd', text: 'POP3 sadece metin, IMAP çoklu ortam destekler' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "15",
        text: 'WWW\'nin temel amacı nedir?',
        options: [
          { id: 'a', text: 'Dosya transferi yapmak' },
          { id: 'b', text: 'E-posta göndermek' },
          { id: 'c', text: 'İnternetteki dokümanlara erişmek' },
          { id: 'd', text: 'Veritabanı yönetimi yapmak' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "16",
        text: 'Web sayfalarını görüntülemek için ne kullanılır?',
        options: [
          { id: 'a', text: 'E-posta istemcisi' },
          { id: 'b', text: 'Tarayıcı (browser)' },
          { id: 'c', text: 'Dosya yöneticisi' },
          { id: 'd', text: 'İşletim sistemi' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "17",
        text: 'Bir web sayfasına erişim sürecinde ilk adım nedir?',
        options: [
          { id: 'a', text: 'Sunucuya bağlanmak' },
          { id: 'b', text: 'DNS\'den IP adresi almak' },
          { id: 'c', text: 'URL adresini algılamak' },
          { id: 'd', text: 'Dosyayı indirmek' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "18",
        text: 'Web sunucusu ne iş yapar?',
        options: [
          { id: 'a', text: 'İstemciden gelen bağlantıları kabul eder ve dosya gönderir' },
          { id: 'b', text: 'E-posta gönderir ve alır' },
          { id: 'c', text: 'Veritabanı yönetir' },
          { id: 'd', text: 'Ağ trafiğini yönlendirir' }
        ],
        correctOptionId: 'a'
      },
      {
        id: "19",
        text: 'Aşağıdakilerden hangisi DNS\'in temel bileşenlerinden biri değildir?',
        options: [
          { id: 'a', text: 'İsim sunucuları' },
          { id: 'b', text: 'Çözümleyiciler' },
          { id: 'c', text: 'Alan adları' },
          { id: 'd', text: 'Web tarayıcıları' }
        ],
        correctOptionId: 'd'
      },
      {
        id: "20",
        text: 'DNS kayıtlarında "MX" kaydı neyi belirtir?',
        options: [
          { id: 'a', text: 'Host adresi' },
          { id: 'b', text: 'Mail alışverişi' },
          { id: 'c', text: 'İsim sunucusu' },
          { id: 'd', text: 'Metin uzantısı' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "21",
        text: 'E-postada "Bcc" başlık alanı ne anlama gelir?',
        options: [
          { id: 'a', text: 'Birincil alıcı' },
          { id: 'b', text: 'İkincil alıcı' },
          { id: 'c', text: 'Gizli alıcı' },
          { id: 'd', text: 'Gönderen' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "22",
        text: 'Aşağıdakilerden hangisi MIME\'in desteklediği içerik türlerinden biri değildir?',
        options: [
          { id: 'a', text: 'Metin' },
          { id: 'b', text: 'Resim' },
          { id: 'c', text: 'Ses' },
          { id: 'd', text: 'Veritabanı' }
        ],
        correctOptionId: 'd'
      },
      {
        id: "23",
        text: 'SMTP hangi TCP portunu kullanır?',
        options: [
          { id: 'a', text: '21' },
          { id: 'b', text: '25' },
          { id: 'c', text: '80' },
          { id: 'd', text: '110' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "24",
        text: 'POP3 hangi TCP portunu kullanır?',
        options: [
          { id: 'a', text: '21' },
          { id: 'b', text: '25' },
          { id: 'c', text: '80' },
          { id: 'd', text: '110' }
        ],
        correctOptionId: 'd'
      },
      {
        id: "25",
        text: 'IMAP\'in POP3\'ten temel farkı nedir?',
        options: [
          { id: 'a', text: 'IMAP mesajları siler, POP3 saklar' },
          { id: 'b', text: 'IMAP mesajları sunucuda bırakır, POP3 indirir' },
          { id: 'c', text: 'IMAP daha az güvenlidir' },
          { id: 'd', text: 'IMAP sadece metin destekler' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "26",
        text: 'WWW\'de bir bağlantıya (link) tıklanınca ne olur?',
        options: [
          { id: 'a', text: 'Yeni bir e-posta gönderilir' },
          { id: 'b', text: 'Başka bir web sayfasına veya kaynağa gidilir' },
          { id: 'c', text: 'Dosya indirilir' },
          { id: 'd', text: 'Uygulama başlatılır' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "27",
        text: 'Web sayfaları hangi dilde yazılır?',
        options: [
          { id: 'a', text: 'C++' },
          { id: 'b', text: 'Java' },
          { id: 'c', text: 'HTML' },
          { id: 'd', text: 'Python' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "28",
        text: 'Bir web sunucusuna istek gönderildiğinde kullanılan temel protokol nedir?',
        options: [
          { id: 'a', text: 'FTP' },
          { id: 'b', text: 'SMTP' },
          { id: 'c', text: 'HTTP' },
          { id: 'd', text: 'TCP' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "29",
        text: 'DNS\'de "SOA" kaydı neyi ifade eder?',
        options: [
          { id: 'a', text: 'Host bilgisi' },
          { id: 'b', text: 'Mail alışverişi' },
          { id: 'c', text: 'Zone yetkisi başlangıcı' },
          { id: 'd', text: 'Metin uzantısı' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "30",
        text: 'E-posta adresinde kullanılan "@" işareti neyi ayırır?',
        options: [
          { id: 'a', text: 'Ad ve soyadı' },
          { id: 'b', text: 'Kullanıcı adı ve alan adı' },
          { id: 'c', text: 'Şehir ve ülke' },
          { id: 'd', text: 'Protokol ve port numarası' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "31",
        text: 'MIME\'de "Content-Type" başlığı neyi belirtir?',
        options: [
          { id: 'a', text: 'Mesajın şifreleme türü' },
          { id: 'b', text: 'Mesajın gönderilme tarihi' },
          { id: 'c', text: 'Mesajın içerik türü' },
          { id: 'd', text: 'Mesajın alıcısı' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "32",
        text: 'SMTP\'de "HELO" komutu ne için kullanılır?',
        options: [
          { id: 'a', text: 'Mesaj göndermeye başlamak' },
          { id: 'b', text: 'Sunucuya bağlanmak' },
          { id: 'c', text: 'Alıcı adresini belirtmek' },
          { id: 'd', text: 'Mesajı sonlandırmak' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "33",
        text: 'POP3\'te "RETR" komutu ne işe yarar?',
        options: [
          { id: 'a', text: 'Mesajı silmek' },
          { id: 'b', text: 'Mesajı almak' },
          { id: 'c', text: 'Mesajı listelemek' },
          { id: 'd', text: 'Sunucudan çıkmak' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "34",
        text: 'WWW\'de "URL" neyin kısaltmasıdır?',
        options: [
          { id: 'a', text: 'Universal Resource Locator' },
          { id: 'b', text: 'Uniform Resource Locator' },
          { id: 'c', text: 'Unique Resource Locator' },
          { id: 'd', text: 'Unified Resource Locator' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "35",
        text: 'DNS sorgusu sonucunda alınan bilgiye ne ad verilir?',
        options: [
          { id: 'a', text: 'IP adresi' },
          { id: 'b', text: 'MAC adresi' },
          { id: 'c', text: 'Domain adı' },
          { id: 'd', text: 'Protokol numarası' }
        ],
        correctOptionId: 'a'
      },
      {
        id: "36",
        text: 'E-posta mesajının hangi bölümünde alıcı, gönderen, konu gibi bilgiler yer alır?',
        options: [
          { id: 'a', text: 'Gövde' },
          { id: 'b', text: 'Başlık' },
          { id: 'c', text: 'Ek' },
          { id: 'd', text: 'İmza' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "37",
        text: 'MIME\'de "multipart/alternative" ne anlama gelir?',
        options: [
          { id: 'a', text: 'Mesajın farklı parçalarının sıralı gönderilmesi' },
          { id: 'b', text: 'Mesajın farklı formatlarda gönderilmesi' },
          { id: 'c', text: 'Mesajın şifrelenmiş olarak gönderilmesi' },
          { id: 'd', text: 'Mesajın sıkıştırılmış olarak gönderilmesi' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "38",
        text: 'SMTP\'de "MAIL FROM" komutu neyi belirtir?',
        options: [
          { id: 'a', text: 'Alıcı adresi' },
          { id: 'b', text: 'Gönderen adresi' },
          { id: 'c', text: 'Konu' },
          { id: 'd', text: 'Mesaj içeriği' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "39",
        text: 'POP3\'te "DELE" komutu ne yapar?',
        options: [
          { id: 'a', text: 'Mesajı indirir' },
          { id: 'b', text: 'Mesajı siler' },
          { id: 'c', text: 'Mesajı taşır' },
          { id: 'd', text: 'Mesajı kopyalar' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "40",
        text: 'WWW\'de bir web sunucusunun ana görevi nedir?',
        options: [
          { id: 'a', text: 'E-posta göndermek' },
          { id: 'b', text: 'Veritabanı yönetmek' },
          { id: 'c', text: 'İstemcilere web sayfaları sağlamak' },
          { id: 'd', text: 'Ağ trafiğini yönlendirmek' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "41",
        text: 'DNS\'de "PTR" kaydı ne için kullanılır?',
        options: [
          { id: 'a', text: 'IP adresinden host adına çevirme' },
          { id: 'b', text: 'Host adından IP adresine çevirme' },
          { id: 'c', text: 'Mail sunucusu belirtme' },
          { id: 'd', text: 'İsim sunucusu belirtme' }
        ],
        correctOptionId: 'a'
      },
      {
        id: "42",
        text: 'E-posta mesajında "Reply-To" başlığı neyi ifade eder?',
        options: [
          { id: 'a', text: 'Mesajın gönderilme tarihi' },
          { id: 'b', text: 'Mesaja cevap gönderilecek adres' },
          { id: 'c', text: 'Mesajın konusu' },
          { id: 'd', text: 'Mesajın önceliği' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "43",
        text: 'MIME\'de "Content-Transfer-Encoding" neyi belirtir?',
        options: [
          { id: 'a', text: 'İçerik türü' },
          { id: 'b', text: 'İçerik uzunluğu' },
          { id: 'c', text: 'İçerik kodlama yöntemi' },
          { id: 'd', text: 'İçerik dili' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "44",
        text: 'SMTP\'de "RCPT TO" komutu neyi belirtir?',
        options: [
          { id: 'a', text: 'Gönderen adresi' },
          { id: 'b', text: 'Alıcı adresi' },
          { id: 'c', text: 'Mesaj konusu' },
          { id: 'd', text: 'Mesaj içeriği' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "45",
        text: 'POP3\'te "QUIT" komutu ne yapar?',
        options: [
          { id: 'a', text: 'Mesajı indirir' },
          { id: 'b', text: 'Mesajı siler' },
          { id: 'c', text: 'Sunucudan çıkar' },
          { id: 'd', text: 'Mesajı listeler' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "46",
        text: 'WWW\'de "HTTP" neyin kısaltmasıdır?',
        options: [
          { id: 'a', text: 'Hypertext Transfer Protocol' },
          { id: 'b', text: 'Hyperlink Text Protocol' },
          { id: 'c', text: 'High-Tech Transfer Protocol' },
          { id: 'd', text: 'Host Transfer Protocol' }
        ],
        correctOptionId: 'a'
      },
      {
        id: "47",
        text: 'DNS\'de "TXT" kaydı ne için kullanılır?',
        options: [
          { id: 'a', text: 'Mail sunucusu belirtmek' },
          { id: 'b', text: 'İsim sunucusu belirtmek' },
          { id: 'c', text: 'Metin uzantıları belirtmek' },
          { id: 'd', text: 'Host adresi belirtmek' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "48",
        text: 'E-posta mesajında "Message-ID" ne işe yarar?',
        options: [
          { id: 'a', text: 'Mesajın konusu' },
          { id: 'b', text: 'Mesajın gönderilme tarihi' },
          { id: 'c', text: 'Mesajın benzersiz kimliği' },
          { id: 'd', text: 'Mesajın önceliği' }
        ],
        correctOptionId: 'c'
      },
      {
        id: "49",
        text: 'MIME\'de "Content-Disposition" neyi belirtir?',
        options: [
          { id: 'a', text: 'İçerik türü' },
          { id: 'b', text: 'İçeriğin nasıl işleneceği' },
          { id: 'c', text: 'İçerik uzunluğu' },
          { id: 'd', text: 'İçerik dili' }
        ],
        correctOptionId: 'b'
      },
      {
        id: "50",
        text: 'SMTP\'de "DATA" komutu neyi başlatır?',
        options: [
          { id: 'a', text: 'Alıcı adresini belirtme' },
          { id: 'b', text: 'Gönderen adresini belirtme' },
          { id: 'c', text: 'Mesaj içeriğini gönderme' },
          { id: 'd', text: 'Bağlantıyı sonlandırma' }
        ],
        correctOptionId: 'c'
      }
    ],
    timeLimit: 50,
    randomizeQuestions: true,
    randomizeOptions: false,
    passingScore: 70,
    isPublished: true,
    createdAt: new Date('2023-10-01T10:00:00Z'),
    updatedAt: new Date('2023-10-15T14:30:00Z'),
  },
  {
    id: '2',
    title: 'Bölüm 8: Nmap Port Tarama Teknikleri Testi',
    slug: 'nmap-port-scanning-techniques',
    description: 'Nmap kullanarak çeşitli port tarama teknikleri hakkında 50 soruluk çoktan seçmeli test.',
    category: 'Siber Güvenlik',
    questions: [
      // Nmap ve port tarama teknikleri ile ilgili sorular eklenecek
    ],
    timeLimit: 50,
    randomizeQuestions: true,
    randomizeOptions: false,
    passingScore: 70,
    isPublished: true,
    createdAt: new Date('2023-10-02T10:00:00Z'),
    updatedAt: new Date('2023-10-16T14:30:00Z'),
  }
];

export function getTestBySlug(slug: string): Test | undefined {
  return TESTS.find(test => test.slug === slug);
}

// The following functions will be removed as they are now handled by testActions.ts with Supabase integration.
/*
export function getTests(): Test[] {
  return TESTS;
}

export function getTestById(id: string): Test | undefined {
  return TESTS.find(test => test.id === id);
}
*/ 