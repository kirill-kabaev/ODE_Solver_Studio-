' ==============================================================================
' Студия СЛАУ и Дифференциальных Уравнений (Silent Fast Launcher)
' ==============================================================================

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
currentDir = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = currentDir
WshShell.Run "cmd /c start-production.bat", 0, False
