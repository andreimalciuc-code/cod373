/* Cod373 — i18n universal (traducere după textul-sursă RO → RU/DE/EN).
   Traduce noduri de text + atribute (placeholder/title/value buton) și
   urmărește DOM-ul pentru conținut dinamic. Textele netraduse rămân în RO. */
(function(){
  var LANG = localStorage.getItem('c373_lang') || 'ro';
  var LANGS = { ro:'RO', ru:'RU', de:'DE', en:'EN' };

  // Dicționar: cheia = textul ROMÂNESC exact (trim). Valoare = {ru,de,en}.
  var D = {
    // grupuri meniu
    'Operațional':{ru:'Операционный',de:'Betrieb',en:'Operations'},
    'Catalog':{ru:'Каталог',de:'Katalog',en:'Catalog'},
    'Finanțe':{ru:'Финансы',de:'Finanzen',en:'Finance'},
    'Echipă':{ru:'Команда',de:'Team',en:'Team'},
    'Altele':{ru:'Другое',de:'Sonstiges',en:'Other'},
    'Administrare':{ru:'Администрирование',de:'Verwaltung',en:'Administration'},
    // module / titluri
    'Tablou de bord':{ru:'Панель',de:'Übersicht',en:'Dashboard'},
    'Șantiere':{ru:'Объекты',de:'Baustellen',en:'Sites'},
    'Clienți':{ru:'Клиенты',de:'Kunden',en:'Clients'},
    'Materiale':{ru:'Материалы',de:'Materialien',en:'Materials'},
    'Servicii':{ru:'Услуги',de:'Leistungen',en:'Services'},
    'Instrumente & utilaje':{ru:'Инструменты и техника',de:'Werkzeuge & Geräte',en:'Tools & equipment'},
    'Comenzi materiale':{ru:'Заказы материалов',de:'Materialbestellungen',en:'Material orders'},
    'Previzualizare șantier':{ru:'Осмотр объекта',de:'Baustellen-Vorschau',en:'Site survey'},
    'Devize':{ru:'Сметы',de:'Angebote',en:'Estimates'},
    'Facturi':{ru:'Счета',de:'Rechnungen',en:'Invoices'},
    'Angajați':{ru:'Сотрудники',de:'Mitarbeiter',en:'Employees'},
    'Subcontractori':{ru:'Субподрядчики',de:'Subunternehmer',en:'Subcontractors'},
    'Salarii':{ru:'Зарплаты',de:'Löhne',en:'Payroll'},
    'Documente':{ru:'Документы',de:'Dokumente',en:'Documents'},
    'Acte & Documente':{ru:'Документы',de:'Dokumente',en:'Documents'},
    'Norme de deviz':{ru:'Сметные нормы',de:'Kalkulationsnormen',en:'Cost norms'},
    'Etape de lucru':{ru:'Этапы работ',de:'Arbeitsphasen',en:'Work stages'},
    'Recenzii clienți':{ru:'Отзывы клиентов',de:'Kundenbewertungen',en:'Client reviews'},
    'Utilizatori':{ru:'Пользователи',de:'Benutzer',en:'Users'},
    'Setări firmă':{ru:'Настройки фирмы',de:'Firmeneinstellungen',en:'Company settings'},
    'Hartă flotă':{ru:'Карта автопарка',de:'Flottenkarte',en:'Fleet map'},
    'Membrii firmei':{ru:'Сотрудники фирмы',de:'Firmenmitglieder',en:'Company members'},
    'Ghid':{ru:'Руководство',de:'Anleitung',en:'Guide'},
    // butoane / acțiuni comune
    'Salvează':{ru:'Сохранить',de:'Speichern',en:'Save'},
    'Salvează setările':{ru:'Сохранить настройки',de:'Einstellungen speichern',en:'Save settings'},
    'Anulează':{ru:'Отмена',de:'Abbrechen',en:'Cancel'},
    'Închide':{ru:'Закрыть',de:'Schließen',en:'Close'},
    'Editează':{ru:'Редактировать',de:'Bearbeiten',en:'Edit'},
    'Șterge':{ru:'Удалить',de:'Löschen',en:'Delete'},
    'Adaugă':{ru:'Добавить',de:'Hinzufügen',en:'Add'},
    'Adaugă membru':{ru:'Добавить участника',de:'Mitglied hinzufügen',en:'Add member'},
    'Înapoi':{ru:'Назад',de:'Zurück',en:'Back'},
    'Înapoi la aplicație':{ru:'Назад в приложение',de:'Zurück zur App',en:'Back to app'},
    '＋ nou':{ru:'＋ новый',de:'＋ neu',en:'＋ new'},
    '＋ rapid':{ru:'＋ быстро',de:'＋ schnell',en:'＋ quick'},
    '＋ adaugă linie':{ru:'＋ добавить строку',de:'＋ Zeile hinzufügen',en:'＋ add line'},
    '＋ adaugă măsurătoare':{ru:'＋ добавить замер',de:'＋ Maß hinzufügen',en:'＋ add measurement'},
    'Caută…':{ru:'Поиск…',de:'Suchen…',en:'Search…'},
    'Caută...':{ru:'Поиск...',de:'Suchen...',en:'Search...'},
    'Caută sau scrie…':{ru:'Найдите или впишите…',de:'Suchen oder eingeben…',en:'Search or type…'},
    'Toate stările':{ru:'Все статусы',de:'Alle Status',en:'All statuses'},
    'Toate':{ru:'Все',de:'Alle',en:'All'},
    'Printează':{ru:'Печать',de:'Drucken',en:'Print'},
    'Tipărește / Salvează PDF':{ru:'Печать / PDF',de:'Drucken / PDF',en:'Print / Save PDF'},
    'Export':{ru:'Экспорт',de:'Export',en:'Export'},
    // login / cont
    'Intră în cont':{ru:'Войти',de:'Anmelden',en:'Sign in'},
    'Intră':{ru:'Войти',de:'Anmelden',en:'Sign in'},
    'Bun venit înapoi':{ru:'С возвращением',de:'Willkommen zurück',en:'Welcome back'},
    'Email':{ru:'Эл. почта',de:'E-Mail',en:'Email'},
    'Parolă':{ru:'Пароль',de:'Passwort',en:'Password'},
    'Am uitat parola':{ru:'Забыли пароль',de:'Passwort vergessen',en:'Forgot password'},
    'Intră cu link pe email':{ru:'Войти по ссылке',de:'Per E-Mail-Link anmelden',en:'Sign in with email link'},
    'Creează firmă nouă':{ru:'Создать фирму',de:'Neue Firma erstellen',en:'Create new company'},
    'Creează cont':{ru:'Создать аккаунт',de:'Konto erstellen',en:'Create account'},
    'Ieși':{ru:'Выход',de:'Abmelden',en:'Sign out'},
    'Iești':{ru:'Выход',de:'Abmelden',en:'Sign out'},
    // stări
    'Planificat':{ru:'Запланировано',de:'Geplant',en:'Planned'},
    'Activ':{ru:'Активно',de:'Aktiv',en:'Active'},
    'În lucru':{ru:'В работе',de:'In Arbeit',en:'In progress'},
    'În pauză':{ru:'Пауза',de:'Pausiert',en:'Paused'},
    'Finalizat':{ru:'Завершено',de:'Abgeschlossen',en:'Completed'},
    'Finalizată':{ru:'Завершено',de:'Abgeschlossen',en:'Completed'},
    'Anulat':{ru:'Отменено',de:'Storniert',en:'Cancelled'},
    'Întârziat':{ru:'Просрочено',de:'Verspätet',en:'Delayed'},
    'Ciornă':{ru:'Черновик',de:'Entwurf',en:'Draft'},
    'Trimisă':{ru:'Отправлено',de:'Gesendet',en:'Sent'},
    'Acceptată':{ru:'Принято',de:'Angenommen',en:'Accepted'},
    'Respinsă':{ru:'Отклонено',de:'Abgelehnt',en:'Rejected'},
    'Plătită':{ru:'Оплачено',de:'Bezahlt',en:'Paid'},
    'Restantă':{ru:'Просрочено',de:'Überfällig',en:'Overdue'},
    'Stare':{ru:'Статус',de:'Status',en:'Status'},
    // etichete frecvente
    'Client':{ru:'Клиент',de:'Kunde',en:'Client'},
    'Denumire':{ru:'Наименование',de:'Bezeichnung',en:'Name'},
    'Descriere':{ru:'Описание',de:'Beschreibung',en:'Description'},
    'Adresă':{ru:'Адрес',de:'Adresse',en:'Address'},
    'Telefon':{ru:'Телефон',de:'Telefon',en:'Phone'},
    'Cantitate':{ru:'Количество',de:'Menge',en:'Quantity'},
    'Cant.':{ru:'Кол-во',de:'Menge',en:'Qty'},
    'Preț':{ru:'Цена',de:'Preis',en:'Price'},
    'Total':{ru:'Итого',de:'Gesamt',en:'Total'},
    'Subtotal':{ru:'Подытог',de:'Zwischensumme',en:'Subtotal'},
    'Sumar':{ru:'Итоги',de:'Zusammenfassung',en:'Summary'},
    'Buget':{ru:'Бюджет',de:'Budget',en:'Budget'},
    'Progres':{ru:'Прогресс',de:'Fortschritt',en:'Progress'},
    'Termen':{ru:'Срок',de:'Frist',en:'Deadline'},
    'Scadență':{ru:'Срок оплаты',de:'Fälligkeit',en:'Due date'},
    'Data emiterii':{ru:'Дата выставления',de:'Ausstellungsdatum',en:'Issue date'},
    'Număr':{ru:'Номер',de:'Nummer',en:'Number'},
    'Note / condiții':{ru:'Примечания / условия',de:'Notizen / Bedingungen',en:'Notes / terms'},
    'Materiale estimate':{ru:'Оценка материалов',de:'Geschätzte Materialien',en:'Estimated materials'},
    'Se încarcă…':{ru:'Загрузка…',de:'Lädt…',en:'Loading…'},
    // editor oferte/facturi
    'Ofertă / Deviz':{ru:'Смета',de:'Angebot',en:'Estimate'},
    'Factură':{ru:'Счёт',de:'Rechnung',en:'Invoice'},
    'Detalii ofertă':{ru:'Детали сметы',de:'Angebotsdetails',en:'Estimate details'},
    'Detalii factură':{ru:'Детали счёта',de:'Rechnungsdetails',en:'Invoice details'},
    'Linii ofertă':{ru:'Строки сметы',de:'Angebotspositionen',en:'Estimate lines'},
    'Linii factură':{ru:'Строки счёта',de:'Rechnungspositionen',en:'Invoice lines'},
    'Salvează oferta':{ru:'Сохранить смету',de:'Angebot speichern',en:'Save estimate'},
    'Salvează factura':{ru:'Сохранить счёт',de:'Rechnung speichern',en:'Save invoice'},
    'Convertește în factură':{ru:'В счёт',de:'In Rechnung umwandeln',en:'Convert to invoice'},
    'Creează șantier':{ru:'Создать объект',de:'Baustelle erstellen',en:'Create site'},
    'Marchează plătită':{ru:'Отметить оплаченной',de:'Als bezahlt markieren',en:'Mark as paid'},
    // grafic
    'Grafic lucrări':{ru:'График работ',de:'Bauzeitenplan',en:'Work schedule'},
    'Graficul lucrărilor':{ru:'График работ',de:'Bauzeitenplan',en:'Work schedule'},
    'Etape':{ru:'Этапы',de:'Phasen',en:'Stages'},
    'Cronologie':{ru:'Хронология',de:'Zeitleiste',en:'Timeline'},
    'Drum critic':{ru:'Критический путь',de:'Kritischer Pfad',en:'Critical path'},
    'Astăzi':{ru:'Сегодня',de:'Heute',en:'Today'},
    'Etapă':{ru:'Этап',de:'Phase',en:'Stage'},
    'Jalon':{ru:'Веха',de:'Meilenstein',en:'Milestone'},
    'Executant':{ru:'Исполнитель',de:'Ausführender',en:'Contractor'},
    'Specialitate':{ru:'Специальность',de:'Fachgebiet',en:'Specialty'},
    'Marjă live':{ru:'Маржа в реальном времени',de:'Live-Marge',en:'Live margin'},
    'Cheltuieli':{ru:'Расходы',de:'Ausgaben',en:'Expenses'},
    'Buget contractat':{ru:'Бюджет по договору',de:'Vertragsbudget',en:'Contract budget'},
    // mobil
    'Aplicația de teren':{ru:'Полевое приложение',de:'Außendienst-App',en:'Field app'},
    'Proiectele mele':{ru:'Мои проекты',de:'Meine Projekte',en:'My projects'},
    'Lucrările mele':{ru:'Мои работы',de:'Meine Arbeiten',en:'My work'},
    'Comandă':{ru:'Заказ',de:'Bestellung',en:'Order'},
    'Pontaj':{ru:'Учёт времени',de:'Zeiterfassung',en:'Timesheet'},
    'Poze':{ru:'Фото',de:'Fotos',en:'Photos'},
    'Defecte':{ru:'Дефекты',de:'Mängel',en:'Defects'},
    'Probleme':{ru:'Проблемы',de:'Probleme',en:'Issues'},
    'Livrări':{ru:'Доставки',de:'Lieferungen',en:'Deliveries'},
    'Acasă':{ru:'Главная',de:'Start',en:'Home'},
    'Proiecte':{ru:'Проекты',de:'Projekte',en:'Projects'},
    'Oferte':{ru:'Сметы',de:'Angebote',en:'Estimates'},
    'Șantierele tale':{ru:'Ваши объекты',de:'Deine Baustellen',en:'Your sites'},
    'Notificări':{ru:'Уведомления',de:'Benachrichtigungen',en:'Notifications'},
    // portal
    'Portal client':{ru:'Клиентский портал',de:'Kundenportal',en:'Client portal'},
    'Proiectul dumneavoastră':{ru:'Ваш проект',de:'Ihr Projekt',en:'Your project'},
    'Progres lucrări':{ru:'Прогресс работ',de:'Baufortschritt',en:'Work progress'},
    'Etapele lucrării':{ru:'Этапы работ',de:'Arbeitsphasen',en:'Work stages'},
    'Detalii financiare':{ru:'Финансовые детали',de:'Finanzdetails',en:'Financial details'},
    // login extins + comune
    'Autentifică-te în contul firmei tale.':{ru:'Войдите в аккаунт вашей фирмы.',de:'Melden Sie sich im Firmenkonto an.',en:'Sign in to your company account.'},
    'Nu ai cont?':{ru:'Нет аккаунта?',de:'Kein Konto?',en:'No account?'},
    'Ai deja cont?':{ru:'Уже есть аккаунт?',de:'Schon ein Konto?',en:'Already have an account?'},
    'Autentifică-te':{ru:'Войти',de:'Anmelden',en:'Sign in'},
    'Creează un cont':{ru:'Создать аккаунт',de:'Konto erstellen',en:'Create an account'},
    'Confirmă parola':{ru:'Подтвердите пароль',de:'Passwort bestätigen',en:'Confirm password'},
    'Setează o parolă nouă':{ru:'Задайте новый пароль',de:'Neues Passwort festlegen',en:'Set a new password'},
    'Salvează parola și intră':{ru:'Сохранить пароль и войти',de:'Passwort speichern & anmelden',en:'Save password & sign in'},
    'Da':{ru:'Да',de:'Ja',en:'Yes'},'Nu':{ru:'Нет',de:'Nein',en:'No'},
    'Trimite':{ru:'Отправить',de:'Senden',en:'Send'},'Confirmă':{ru:'Подтвердить',de:'Bestätigen',en:'Confirm'},
    'Rol':{ru:'Роль',de:'Rolle',en:'Role'},'Activ':{ru:'Активен',de:'Aktiv',en:'Active'},'Inactiv':{ru:'Неактивен',de:'Inaktiv',en:'Inactive'},
    'Proprietar':{ru:'Владелец',de:'Inhaber',en:'Owner'},'Administrator':{ru:'Администратор',de:'Administrator',en:'Admin'},
    'Responsabil':{ru:'Ответственный',de:'Verantwortlicher',en:'Manager'},'Contabil':{ru:'Бухгалтер',de:'Buchhalter',en:'Accountant'},
    'Muncitor':{ru:'Рабочий',de:'Arbeiter',en:'Worker'},'Șofer':{ru:'Водитель',de:'Fahrer',en:'Driver'},
    'Subcontractant':{ru:'Субподрядчик',de:'Subunternehmer',en:'Subcontractor'},
    'Denumirea firmei *':{ru:'Название фирмы *',de:'Firmenname *',en:'Company name *'},
    'Salut! 👋':{ru:'Привет! 👋',de:'Hallo! 👋',en:'Hello! 👋'},
    'Invită prin link':{ru:'Пригласить по ссылке',de:'Per Link einladen',en:'Invite via link'},
    'Confidențialitate & date':{ru:'Конфиденциальность и данные',de:'Datenschutz & Daten',en:'Privacy & data'},
    'Logo firmă':{ru:'Логотип фирмы',de:'Firmenlogo',en:'Company logo'},
    'Vezi pozele lucrării':{ru:'Смотреть фото работ',de:'Baufotos ansehen',en:'View work photos'},
    'Materiale & consumabile estimate':{ru:'Оценка материалов и расходников',de:'Geschätzte Materialien & Verbrauch',en:'Estimated materials & consumables'},
    'Adaugă lucrare':{ru:'Добавить работу',de:'Arbeit hinzufügen',en:'Add work'},
    'Adaugă din norme':{ru:'Добавить из норм',de:'Aus Normen hinzufügen',en:'Add from norms'},
    'Din norme':{ru:'Из норм',de:'Aus Normen',en:'From norms'},
    'Din servicii':{ru:'Из услуг',de:'Aus Leistungen',en:'From services'},
    'Niciun rezultat.':{ru:'Нет результатов.',de:'Keine Ergebnisse.',en:'No results.'},
    'Niciuna':{ru:'Нет',de:'Keine',en:'None'}
  };

  function look(s){ if(!s) return null; var k=String(s).trim(); var e=D[k]; return (e&&e[LANG])?{k:k,v:e[LANG]}:null; }
  function tNode(n){ var v=n.nodeValue; if(!v) return; var t=v.trim(); if(!t) return; var r=look(t); if(r) n.nodeValue=v.replace(t,r.v); }
  function tEl(el){
    if(el.getAttribute){
      ['placeholder','title','aria-label'].forEach(function(a){ var val=el.getAttribute(a); if(val){ var r=look(val); if(r) el.setAttribute(a,r.v); } });
      if(el.tagName==='INPUT'){ var ty=(el.type||'').toLowerCase(); if(ty==='button'||ty==='submit'){ var r2=look(el.value); if(r2) el.value=r2.v; } }
    }
  }
  function walk(node){
    if(!node) return;
    if(node.nodeType===3){ tNode(node); return; }
    if(node.nodeType!==1) return;
    var tag=node.tagName; if(tag==='SCRIPT'||tag==='STYLE'||tag==='TEXTAREA') return;
    tEl(node);
    for(var c=node.firstChild;c;c=c.nextSibling) walk(c);
  }
  function translateAll(){ if(LANG==='ro'||!document.body) return; walk(document.body); }

  var obs=null;
  function startObs(){ if(obs||LANG==='ro') return; obs=new MutationObserver(function(muts){ if(LANG==='ro')return; for(var i=0;i<muts.length;i++){ var an=muts[i].addedNodes; for(var j=0;j<an.length;j++) walk(an[j]); } });
    obs.observe(document.body,{childList:true,subtree:true}); }

  function setLang(l){ if(!LANGS[l]) return; localStorage.setItem('c373_lang',l); location.reload(); }
  window.C373setLang=setLang; window.C373lang=function(){ return LANG; };

  function injectSwitcher(){
    if(document.getElementById('c373-lang')) return;
    var box=document.createElement('div'); box.id='c373-lang';
    box.style.cssText='position:fixed;bottom:12px;right:12px;z-index:99999;background:#0f1c33;border-radius:999px;padding:3px;display:flex;gap:2px;box-shadow:0 6px 20px rgba(15,28,51,.3);font-family:system-ui,Arial,sans-serif';
    Object.keys(LANGS).forEach(function(l){ var b=document.createElement('button'); b.textContent=LANGS[l];
      b.style.cssText='border:none;cursor:pointer;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:700;'+(l===LANG?'background:#ff8a3d;color:#fff':'background:transparent;color:#cbd5e1');
      b.onclick=function(){ if(l!==LANG) setLang(l); };
      box.appendChild(b); });
    document.body.appendChild(box);
  }

  function init(){ translateAll(); startObs(); injectSwitcher(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
