' ==============================================================================
' Студия СЛАУ и Дифференциальных Уравнений (Silent Background Launcher)
' Запускает сервер и сразу открывает браузер БЕЗ появления черного окна CMD
' ==============================================================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Запуск start-production.bat в полностью скрытом режиме (окно = 0)
WshShell.CurrentDirectory = currentDir
WshShell.Run "cmd /c start-production.bat", 0, False
