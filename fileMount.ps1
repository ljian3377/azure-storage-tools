$accountName = ""
$accountKey = ""
$connectTestResult = Test-NetConnection -ComputerName $accountName.file.core.windows.net -Port 445
if ($connectTestResult.TcpTestSucceeded) {
    # Save the password so the drive will persist on reboot
    cmd.exe /C "cmdkey /add:`"$accountName.file.core.windows.net`" /user:`"Azure\$accountName`" /pass:`"$accountKey`""
    # Mount the drive
    New-PSDrive -Name I -PSProvider FileSystem -Root "\\$accountName.file.core.windows.net\share157726383502004793" -Persist
} else {
    Write-Error -Message "Unable to reach the Azure storage account via port 445. Check to make sure your organization or ISP is not blocking port 445, or use Azure P2S VPN, Azure S2S VPN, or Express Route to tunnel SMB traffic over a different port."
}