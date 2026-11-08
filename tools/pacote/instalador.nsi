; Instalador do KOFstation novo (M15.3; NSIS, LZMA sólido), no molde do empacotar/instalador.nsi do antigo.
;   makensis -DORIGEM=<pasta KOFstation> -DSAIDA=<exe> -DVERSAO=<versão> tools/pacote/instalador.nsi
; Só pro usuário (sem pedir administrador), em %LOCALAPPDATA%\Programs\KOFstation: o atualizador consegue gravar ali.
; Os dados (saves, biblioteca) ficam em %LOCALAPPDATA%\KOFstation, separados; o antigo usa %LOCALAPPDATA%\KOFnes.
Unicode true
Target amd64-unicode
SetCompressor /SOLID lzma
SetCompressorDictSize 32
RequestExecutionLevel user

Name "KOFstation novo"
OutFile "${SAIDA}"
Icon "${ORIGEM}\icone.ico"
UninstallIcon "${ORIGEM}\icone.ico"
InstallDir "$LOCALAPPDATA\Programs\KOFstation"
BrandingText "KOFstation ☕ ${VERSAO}"

!include "MUI2.nsh"
!define MUI_ICON "${ORIGEM}\icone.ico"
!define MUI_UNICON "${ORIGEM}\icone.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\KOFstation.exe"
!define MUI_FINISHPAGE_RUN_TEXT "Abrir o KOFstation agora"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "PortugueseBR"

!define UNINST "Software\Microsoft\Windows\CurrentVersion\Uninstall\KOFstationNovo"

Section "KOFstation"
    ; fecha o que estiver aberto desta pasta (o executável e o processo do jogo nativo), senão a cópia falha
    nsExec::Exec 'taskkill /F /IM KOFstation.exe'
    SetOutPath "$INSTDIR"
    File /r "${ORIGEM}\*.*"
    WriteUninstaller "$INSTDIR\Desinstalar.exe"
    CreateShortcut "$DESKTOP\KOFstation novo.lnk" "$INSTDIR\KOFstation.exe" "" "$INSTDIR\icone.ico"
    CreateDirectory "$SMPROGRAMS\KOFstation novo"
    CreateShortcut "$SMPROGRAMS\KOFstation novo\KOFstation novo.lnk" "$INSTDIR\KOFstation.exe" "" "$INSTDIR\icone.ico"
    CreateShortcut "$SMPROGRAMS\KOFstation novo\Desinstalar.lnk" "$INSTDIR\Desinstalar.exe"
    WriteRegStr HKCU "${UNINST}" "DisplayName" "KOFstation novo"
    WriteRegStr HKCU "${UNINST}" "DisplayVersion" "${VERSAO}"
    WriteRegStr HKCU "${UNINST}" "Publisher" "Marcelao98"
    WriteRegStr HKCU "${UNINST}" "DisplayIcon" "$INSTDIR\icone.ico"
    WriteRegStr HKCU "${UNINST}" "UninstallString" '"$INSTDIR\Desinstalar.exe"'
    WriteRegDWORD HKCU "${UNINST}" "NoModify" 1
    WriteRegDWORD HKCU "${UNINST}" "NoRepair" 1
SectionEnd

; apaga o programa (o que o instalador e o atualizador puseram); saves, biblioteca e jogos ficam
Section "Uninstall"
    nsExec::Exec 'taskkill /F /IM KOFstation.exe'
    RMDir /r "$INSTDIR\nucleos"
    RMDir /r "$INSTDIR\nativo"
    RMDir /r "$INSTDIR\.atualizacao"
    Delete "$INSTDIR\KOFstation.exe"
    Delete "$INSTDIR\KOFstation.exe.velho"
    Delete "$INSTDIR\versao.txt"
    Delete "$INSTDIR\icone.ico"
    Delete "$INSTDIR\LEIA-ME.txt"
    Delete "$INSTDIR\atualizacao.log"
    Delete "$INSTDIR\Desinstalar.exe"
    RMDir "$INSTDIR"
    Delete "$DESKTOP\KOFstation novo.lnk"
    RMDir /r "$SMPROGRAMS\KOFstation novo"
    DeleteRegKey HKCU "${UNINST}"
SectionEnd
